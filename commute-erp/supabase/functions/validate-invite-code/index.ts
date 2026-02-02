// =====================================================
// 초대코드 검증 Edge Function
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface ValidateRequest {
  inviteCode?: string;
  invite_code?: string;
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
    const body = (await req.json()) as ValidateRequest;

    // snake_case와 camelCase 모두 지원
    const inviteCode = body.inviteCode || body.invite_code;

    if (!inviteCode) {
      return new Response(
        JSON.stringify({ error: "초대코드를 입력해주세요." }),
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
        JSON.stringify({ 
          valid: false,
          error: "유효하지 않은 초대코드입니다." 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!business.is_active) {
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: "비활성화된 사업장입니다." 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        businessId: business.id,
        business_id: business.id,
        businessName: business.name,
        business_name: business.name,
        companyCode: business.company_code,
        company_code: business.company_code,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Validate invite code error:", err);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
