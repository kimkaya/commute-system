// =====================================================
// 직원 회원가입 Edge Function
// 초대코드로 회사에 가입
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { corsHeaders } from "../_shared/cors.ts";

interface RegisterRequest {
  inviteCode?: string;     // 초대코드 (camelCase)
  invite_code?: string;    // 초대코드 (snake_case)
  name: string;           // 이름
  username: string;       // 로그인 아이디
  password: string;       // 비밀번호
  phone?: string;         // 전화번호 (선택)
  email?: string;         // 이메일 (선택)
  department?: string;    // 부서 (선택)
  position?: string;      // 직급 (선택)
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
    const body = (await req.json()) as RegisterRequest;

    // snake_case와 camelCase 모두 지원
    const inviteCode = body.inviteCode || body.invite_code;

    // 필수 필드 검증
    if (!inviteCode || !body.name || !body.username || !body.password) {
      return new Response(
        JSON.stringify({ error: "필수 항목을 모두 입력해주세요." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 아이디 유효성 검사
    if (body.username.length < 3) {
      return new Response(
        JSON.stringify({ error: "아이디는 3자 이상이어야 합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(body.username)) {
      return new Response(
        JSON.stringify({ error: "아이디는 영문, 숫자, 밑줄(_)만 사용할 수 있습니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 비밀번호 유효성 검사
    if (body.password.length < 4) {
      return new Response(
        JSON.stringify({ error: "비밀번호는 4자 이상이어야 합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 초대코드로 회사 조회
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, name, company_code, is_active")
      .eq("invite_code", inviteCode.toUpperCase())
      .single();

    if (bizError || !business) {
      return new Response(
        JSON.stringify({ error: "유효하지 않은 초대코드입니다." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!business.is_active) {
      return new Response(
        JSON.stringify({ error: "비활성화된 사업장입니다." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 해당 회사 내 아이디 중복 확인
    const { data: existingUser } = await supabase
      .from("employees")
      .select("id")
      .eq("business_id", business.id)
      .ilike("username", body.username)
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "이미 사용 중인 아이디입니다." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 사번 자동 생성 (EMP + 순번)
    const { count } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business.id);

    const employeeNumber = `EMP${String((count || 0) + 1).padStart(3, '0')}`;

    // 비밀번호 해시
    const passwordHash = bcrypt.hashSync(body.password, 10);

    // 직원 생성
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .insert({
        business_id: business.id,
        employee_number: employeeNumber,
        name: body.name,
        username: body.username.toLowerCase(),
        password_hash: passwordHash,
        phone: body.phone || null,
        email: body.email || null,
        department: body.department || null,
        position: body.position || null,
        hire_date: new Date().toISOString().split('T')[0],
        is_active: true,
      })
      .select()
      .single();

    if (empError || !employee) {
      console.error("Employee creation error:", empError);
      return new Response(
        JSON.stringify({ error: "직원 등록에 실패했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 휴가 잔여 초기화 (올해)
    const currentYear = new Date().getFullYear();
    await supabase
      .from("leave_balances")
      .insert({
        business_id: business.id,
        employee_id: employee.id,
        year: currentYear,
        annual_total: 15,
        annual_used: 0,
      });

    // 감사 로그
    await supabase.from("audit_logs").insert({
      business_id: business.id,
      user_id: employee.id,
      user_name: body.name,
      action: "employee_register",
      resource: "employee",
      resource_id: employee.id,
      details: {
        employee_number: employeeNumber,
        username: body.username.toLowerCase(),
      },
      level: "info",
      success: true,
    });

    // 이메일 형식 생성
    const loginEmail = `${body.username.toLowerCase()}@${business.company_code}.com`;

    return new Response(
      JSON.stringify({
        success: true,
        employeeId: employee.id,
        employee_id: employee.id,
        employeeNumber: employeeNumber,
        employee_number: employeeNumber,
        name: body.name,
        businessId: business.id,
        business_id: business.id,
        businessName: business.name,
        business_name: business.name,
        loginEmail: loginEmail,
        email_format: loginEmail,
        message: "회원가입이 완료되었습니다!",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Employee register error:", err);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
