// =====================================================
// 관리자 회원가입 Edge Function
// 새 사업장 생성 + 관리자 계정 생성
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { corsHeaders } from "../_shared/cors.ts";

interface RegisterRequest {
  businessNumber: string;      // 사업자등록번호
  businessName: string;        // 회사명
  companyCode: string;         // 회사코드 (로그인용)
  representativeName?: string; // 대표자명
  address?: string;            // 주소
  phone?: string;              // 전화번호
  adminUsername: string;       // 관리자 아이디
  adminPassword: string;       // 관리자 비밀번호
  adminName?: string;          // 관리자 이름
}

// 회사코드 유효성 검사
function validateCompanyCode(code: string): { valid: boolean; error?: string } {
  if (!code) return { valid: false, error: "회사코드를 입력해주세요." };
  if (code.length < 3) return { valid: false, error: "회사코드는 3자 이상이어야 합니다." };
  if (code.length > 10) return { valid: false, error: "회사코드는 10자 이하여야 합니다." };
  if (!/^[a-zA-Z0-9]+$/.test(code)) return { valid: false, error: "회사코드는 영문과 숫자만 사용할 수 있습니다." };
  return { valid: true };
}

// 사업자등록번호 유효성 검사
function validateBusinessNumber(num: string): { valid: boolean; error?: string } {
  if (!num) return { valid: false, error: "사업자등록번호를 입력해주세요." };
  const cleaned = num.replace(/[^0-9]/g, '');
  if (cleaned.length !== 10) return { valid: false, error: "올바른 사업자등록번호 형식이 아닙니다." };
  return { valid: true };
}

// 랜덤 초대코드 생성
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'INV-';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
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

    // 필수 필드 검증
    if (!body.businessNumber || !body.businessName || !body.companyCode || !body.adminUsername || !body.adminPassword) {
      return new Response(
        JSON.stringify({ error: "필수 항목을 모두 입력해주세요." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 사업자등록번호 유효성 검사
    const bizNumValidation = validateBusinessNumber(body.businessNumber);
    if (!bizNumValidation.valid) {
      return new Response(
        JSON.stringify({ error: bizNumValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 회사코드 유효성 검사
    const codeValidation = validateCompanyCode(body.companyCode);
    if (!codeValidation.valid) {
      return new Response(
        JSON.stringify({ error: codeValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 관리자 아이디 유효성 검사
    if (body.adminUsername.length < 3) {
      return new Response(
        JSON.stringify({ error: "관리자 아이디는 3자 이상이어야 합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 비밀번호 유효성 검사
    if (body.adminPassword.length < 4) {
      return new Response(
        JSON.stringify({ error: "비밀번호는 4자 이상이어야 합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 사업자등록번호 중복 확인
    const cleanedBizNum = body.businessNumber.replace(/[^0-9]/g, '');
    const { data: existingBiz } = await supabase
      .from("businesses")
      .select("id")
      .eq("business_number", cleanedBizNum)
      .single();

    if (existingBiz) {
      return new Response(
        JSON.stringify({ error: "이미 등록된 사업자등록번호입니다." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 회사코드 중복 확인 (대소문자 구분 없음)
    const { data: existingCode } = await supabase
      .from("businesses")
      .select("id")
      .ilike("company_code", body.companyCode)
      .single();

    if (existingCode) {
      return new Response(
        JSON.stringify({ error: "이미 사용 중인 회사코드입니다." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 초대코드 생성 (중복 확인)
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existingInvite } = await supabase
        .from("businesses")
        .select("id")
        .eq("invite_code", inviteCode)
        .single();
      
      if (!existingInvite) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    // 사업장 생성
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .insert({
        name: body.businessName,
        business_number: cleanedBizNum,
        company_code: body.companyCode.toLowerCase(),  // 소문자로 저장
        invite_code: inviteCode,
        address: body.address || null,
        phone: body.phone || null,
        settings: {
          timezone: "Asia/Seoul",
          representative_name: body.representativeName || null,
        },
      })
      .select()
      .single();

    if (bizError || !business) {
      console.error("Business creation error:", bizError);
      return new Response(
        JSON.stringify({ error: "사업장 생성에 실패했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 시스템 설정 생성
    await supabase
      .from("system_settings")
      .insert({
        business_id: business.id,
      });

    // 관리자 계정 생성
    const passwordHash = bcrypt.hashSync(body.adminPassword, 10);
    const { error: adminError } = await supabase
      .from("admins")
      .insert({
        business_id: business.id,
        username: body.adminUsername.toLowerCase(),  // 소문자로 저장
        password_hash: passwordHash,
        name: body.adminName || body.adminUsername,
        role: "super_admin",
      });

    if (adminError) {
      console.error("Admin creation error:", adminError);
      // 관리자 생성 실패 시 사업장도 삭제
      await supabase.from("businesses").delete().eq("id", business.id);
      return new Response(
        JSON.stringify({ error: "관리자 계정 생성에 실패했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 감사 로그
    await supabase.from("audit_logs").insert({
      business_id: business.id,
      user_name: body.adminUsername,
      action: "business_register",
      resource: "business",
      resource_id: business.id,
      details: {
        business_name: body.businessName,
        company_code: body.companyCode.toLowerCase(),
      },
      level: "info",
      success: true,
    });

    // 이메일 형식 생성
    const adminEmail = `${body.adminUsername.toLowerCase()}@${body.companyCode.toLowerCase()}.com`;

    return new Response(
      JSON.stringify({
        success: true,
        businessId: business.id,
        businessName: body.businessName,
        companyCode: body.companyCode.toLowerCase(),
        inviteCode: inviteCode,
        adminEmail: adminEmail,
        message: "회원가입이 완료되었습니다!",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Admin register error:", err);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
