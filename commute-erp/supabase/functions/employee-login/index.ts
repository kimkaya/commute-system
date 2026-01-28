// =====================================================
// 직원 로그인 Edge Function (비밀번호 인증)
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface LoginRequest {
  businessId: string;
  employeeId: string;
  password: string;
  deviceId?: string;
}

const MAX_FAIL_COUNT = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15분

// SHA256 해시 함수
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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

    if (!body.businessId || !body.employeeId || !body.password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 직원 정보 조회
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, department, position, is_active")
      .eq("id", body.employeeId)
      .eq("business_id", body.businessId)
      .single();

    if (employeeError || !employee) {
      return new Response(
        JSON.stringify({ error: "Employee not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!employee.is_active) {
      return new Response(
        JSON.stringify({ error: "Employee is inactive" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 인증 정보 조회
    const { data: credential } = await supabase
      .from("employee_credentials")
      .select("*")
      .eq("employee_id", body.employeeId)
      .single();

    if (!credential) {
      return new Response(
        JSON.stringify({ error: "No password set for this employee" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 계정 잠금 확인
    if (credential.locked_until) {
      const lockedUntil = new Date(credential.locked_until);
      if (lockedUntil > new Date()) {
        const remainingMs = lockedUntil.getTime() - Date.now();
        const remainingMin = Math.ceil(remainingMs / 60000);
        return new Response(
          JSON.stringify({
            error: "Account locked",
            message: `계정이 잠겼습니다. ${remainingMin}분 후에 다시 시도하세요.`,
            locked: true,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 비밀번호 검증 (SHA256)
    const passwordHash = await sha256(body.password);
    const isValid = credential.password_hash === passwordHash;

    if (isValid) {
      // 로그인 성공
      const updateData: Record<string, unknown> = {
        failed_login_count: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
        login_count: (credential.login_count || 0) + 1,
      };

      // 기기 ID 등록 (새 기기인 경우)
      if (body.deviceId) {
        const devices = credential.registered_devices || [];
        if (!devices.includes(body.deviceId)) {
          updateData.registered_devices = [...devices, body.deviceId];
        }
      }

      await supabase
        .from("employee_credentials")
        .update(updateData)
        .eq("employee_id", body.employeeId);

      // 오늘 출퇴근 기록 조회
      const today = new Date().toISOString().split("T")[0];
      const { data: todayRecord } = await supabase
        .from("attendance_records")
        .select("check_in, check_out")
        .eq("business_id", body.businessId)
        .eq("employee_id", body.employeeId)
        .eq("date", today)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          employee: {
            id: employee.id,
            name: employee.name,
            department: employee.department,
            position: employee.position,
          },
          todayCheckIn: todayRecord?.check_in || null,
          todayCheckOut: todayRecord?.check_out || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // 로그인 실패
      const newFailCount = (credential.failed_login_count || 0) + 1;
      const updateData: Record<string, unknown> = { failed_login_count: newFailCount };

      if (newFailCount >= MAX_FAIL_COUNT) {
        updateData.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
        updateData.failed_login_count = 0;
      }

      await supabase
        .from("employee_credentials")
        .update(updateData)
        .eq("employee_id", body.employeeId);

      if (newFailCount >= MAX_FAIL_COUNT) {
        return new Response(
          JSON.stringify({
            error: "Account locked",
            message: `${MAX_FAIL_COUNT}회 실패! 15분간 계정이 잠깁니다.`,
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
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("Employee login error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
