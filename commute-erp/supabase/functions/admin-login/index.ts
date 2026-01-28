// =====================================================
// 관리자 로그인 Edge Function
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface LoginRequest {
  businessId: string;
  password: string;
}

const MAX_FAIL_COUNT = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30분

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const body = (await req.json()) as LoginRequest;

    if (!body.businessId || !body.password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 시스템 설정 조회
    const { data: settings, error: settingsError } = await supabase
      .from("system_settings")
      .select("*")
      .eq("business_id", body.businessId)
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: "Business not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 계정 잠금 확인
    if (settings.admin_locked_until) {
      const lockedUntil = new Date(settings.admin_locked_until);
      if (lockedUntil > new Date()) {
        const remainingMs = lockedUntil.getTime() - Date.now();
        const remainingMin = Math.ceil(remainingMs / 60000);
        return new Response(
          JSON.stringify({ 
            error: "Account locked",
            message: `계정이 잠겼습니다. ${remainingMin}분 후에 다시 시도하세요.`,
            locked: true,
            remainingMinutes: remainingMin,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 비밀번호가 설정되지 않은 경우 기본 비밀번호 사용
    let isValid = false;
    if (!settings.admin_password_hash) {
      // 기본 비밀번호: admin1234
      isValid = body.password === "admin1234";
      
      // 최초 로그인 시 비밀번호 해시 저장
      if (isValid) {
        const hash = await bcrypt.hash(body.password);
        await supabase
          .from("system_settings")
          .update({ admin_password_hash: hash })
          .eq("business_id", body.businessId);
      }
    } else {
      isValid = await bcrypt.compare(body.password, settings.admin_password_hash);
    }

    if (isValid) {
      // 로그인 성공: 실패 카운트 초기화
      await supabase
        .from("system_settings")
        .update({ 
          admin_fail_count: 0,
          admin_locked_until: null,
        })
        .eq("business_id", body.businessId);

      // 감사 로그
      await supabase.from("audit_logs").insert({
        business_id: body.businessId,
        user_name: "관리자",
        action: "login",
        resource: "system",
        details: { type: "admin" },
        level: "info",
        success: true,
      });

      // 사업장 정보 조회
      const { data: business } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", body.businessId)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          businessId: body.businessId,
          businessName: business?.name || "사업장",
          sessionTimeout: settings.session_timeout_minutes || 30,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // 로그인 실패
      const newFailCount = (settings.admin_fail_count || 0) + 1;
      const updateData: Record<string, unknown> = { admin_fail_count: newFailCount };

      if (newFailCount >= MAX_FAIL_COUNT) {
        updateData.admin_locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
        updateData.admin_fail_count = 0;
      }

      await supabase
        .from("system_settings")
        .update(updateData)
        .eq("business_id", body.businessId);

      // 감사 로그
      await supabase.from("audit_logs").insert({
        business_id: body.businessId,
        user_name: "관리자",
        action: "login_failed",
        resource: "system",
        details: { 
          type: "admin",
          failCount: newFailCount,
        },
        level: "warning",
        success: false,
      });

      if (newFailCount >= MAX_FAIL_COUNT) {
        return new Response(
          JSON.stringify({
            error: "Account locked",
            message: `${MAX_FAIL_COUNT}회 실패! 30분간 계정이 잠깁니다.`,
            locked: true,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Invalid password",
          message: `비밀번호가 틀렸습니다. (${newFailCount}/${MAX_FAIL_COUNT})`,
          failCount: newFailCount,
          maxFailCount: MAX_FAIL_COUNT,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("Admin login error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
