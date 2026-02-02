// =====================================================
// 직원 로그인 Edge Function V2
// 이메일 형식 (username@companycode.com)
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { corsHeaders } from "../_shared/cors.ts";

interface LoginRequest {
  email: string;      // username@companycode.com 형식
  password: string;
  deviceId?: string;
}

const MAX_FAIL_COUNT = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15분

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
        JSON.stringify({ error: "올바른 이메일 형식이 아닙니다. (예: hong@company.com)" }),
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

    // 직원 조회
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("*")
      .eq("business_id", business.id)
      .ilike("username", username)
      .single();

    if (empError || !employee) {
      return new Response(
        JSON.stringify({ error: "존재하지 않는 계정입니다." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!employee.is_active) {
      return new Response(
        JSON.stringify({ error: "비활성화된 계정입니다." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 계정 잠금 확인
    if (employee.locked_until) {
      const lockedUntil = new Date(employee.locked_until);
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

    // 비밀번호 검증
    let isValid = false;
    
    // bcrypt 해시인지 확인 ($ 로 시작)
    if (employee.password_hash && employee.password_hash.startsWith('$')) {
      isValid = bcrypt.compareSync(body.password, employee.password_hash);
    } else {
      // 레거시: 평문 비밀번호 비교 (기존 데이터 호환)
      isValid = employee.password_hash === body.password;
      
      // 로그인 성공 시 bcrypt로 업그레이드
      if (isValid) {
        const newHash = bcrypt.hashSync(body.password, 10);
        await supabase
          .from("employees")
          .update({ password_hash: newHash })
          .eq("id", employee.id);
      }
    }

    if (isValid) {
      // 로그인 성공
      await supabase
        .from("employees")
        .update({
          failed_login_count: 0,
          locked_until: null,
          last_login_at: new Date().toISOString(),
        })
        .eq("id", employee.id);

      // 오늘 출퇴근 기록 조회
      const today = new Date().toISOString().split("T")[0];
      const { data: todayRecord } = await supabase
        .from("attendance_records")
        .select("check_in, check_out")
        .eq("business_id", business.id)
        .eq("employee_id", employee.id)
        .eq("date", today)
        .single();

      // 감사 로그
      await supabase.from("audit_logs").insert({
        business_id: business.id,
        user_id: employee.id,
        user_name: employee.name,
        action: "login",
        resource: "employee",
        details: { email: body.email, deviceId: body.deviceId },
        level: "info",
        success: true,
      });

      return new Response(
        JSON.stringify({
          success: true,
          businessId: business.id,
          businessName: business.name,
          companyCode: business.company_code,
          employee: {
            id: employee.id,
            name: employee.name,
            employeeNumber: employee.employee_number,
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
      const newFailCount = (employee.failed_login_count || 0) + 1;
      const updateData: Record<string, unknown> = { failed_login_count: newFailCount };

      if (newFailCount >= MAX_FAIL_COUNT) {
        updateData.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
        updateData.failed_login_count = 0;
      }

      await supabase
        .from("employees")
        .update(updateData)
        .eq("id", employee.id);

      // 감사 로그
      await supabase.from("audit_logs").insert({
        business_id: business.id,
        user_id: employee.id,
        user_name: employee.name,
        action: "login_failed",
        resource: "employee",
        details: { email: body.email, failCount: newFailCount },
        level: "warning",
        success: false,
      });

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
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
