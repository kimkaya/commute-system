// =====================================================
// 관리자 로그인 Edge Function V2
// 이메일 형식 (username@companycode.com)
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { corsHeaders } from "../_shared/cors.ts";

interface LoginRequest {
  email: string;      // username@companycode.com 형식
  password: string;
}

const MAX_FAIL_COUNT = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30분

// 이메일에서 username과 companyCode 추출
function parseEmail(email: string): { username: string; companyCode: string } | null {
  const match = email.toLowerCase().match(/^([a-z0-9_]+)@([a-z0-9]+)\.com$/);
  if (!match) return null;
  return {
    username: match[1],
    companyCode: match[2],
  };
}

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

    if (!body.email || !body.password) {
      return new Response(
        JSON.stringify({ error: "이메일과 비밀번호를 입력해주세요." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 이메일 파싱
    const parsed = parseEmail(body.email);
    if (!parsed) {
      return new Response(
        JSON.stringify({ error: "올바른 이메일 형식이 아닙니다. (예: admin@company.com)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { username, companyCode } = parsed;

    // 회사 조회
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, name, company_code")
      .ilike("company_code", companyCode)
      .single();

    if (bizError || !business) {
      return new Response(
        JSON.stringify({ error: "존재하지 않는 회사코드입니다." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 관리자 조회
    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("*")
      .eq("business_id", business.id)
      .ilike("username", username)
      .single();

    if (adminError || !admin) {
      return new Response(
        JSON.stringify({ error: "존재하지 않는 관리자 계정입니다." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!admin.is_active) {
      return new Response(
        JSON.stringify({ error: "비활성화된 계정입니다." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 계정 잠금 확인
    if (admin.locked_until) {
      const lockedUntil = new Date(admin.locked_until);
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

    // 비밀번호 검증
    const isValid = bcrypt.compareSync(body.password, admin.password_hash);

    if (isValid) {
      // 로그인 성공
      await supabase
        .from("admins")
        .update({ 
          failed_login_count: 0,
          locked_until: null,
          last_login_at: new Date().toISOString(),
        })
        .eq("id", admin.id);

      // 세션 타임아웃 조회
      const { data: settings } = await supabase
        .from("system_settings")
        .select("session_timeout_minutes")
        .eq("business_id", business.id)
        .single();

      // 감사 로그
      await supabase.from("audit_logs").insert({
        business_id: business.id,
        user_id: admin.id,
        user_name: admin.name || admin.username,
        action: "login",
        resource: "admin",
        details: { email: body.email },
        level: "info",
        success: true,
      });

      return new Response(
        JSON.stringify({
          success: true,
          businessId: business.id,
          businessName: business.name,
          companyCode: business.company_code,
          adminId: admin.id,
          adminName: admin.name || admin.username,
          adminRole: admin.role,
          sessionTimeout: settings?.session_timeout_minutes || 30,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // 로그인 실패
      const newFailCount = (admin.failed_login_count || 0) + 1;
      const updateData: Record<string, unknown> = { failed_login_count: newFailCount };

      if (newFailCount >= MAX_FAIL_COUNT) {
        updateData.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
        updateData.failed_login_count = 0;
      }

      await supabase
        .from("admins")
        .update(updateData)
        .eq("id", admin.id);

      // 감사 로그
      await supabase.from("audit_logs").insert({
        business_id: business.id,
        user_id: admin.id,
        user_name: admin.name || admin.username,
        action: "login_failed",
        resource: "admin",
        details: { email: body.email, failCount: newFailCount },
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
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
