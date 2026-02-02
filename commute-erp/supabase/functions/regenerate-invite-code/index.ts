// =====================================================
// 초대코드 재발급 Edge Function
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface RegenerateRequest {
  businessId: string;
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
    const body = (await req.json()) as RegenerateRequest;

    if (!body.businessId) {
      return new Response(
        JSON.stringify({ error: "사업장 ID가 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 사업장 확인
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, name, invite_code")
      .eq("id", body.businessId)
      .single();

    if (bizError || !business) {
      return new Response(
        JSON.stringify({ error: "존재하지 않는 사업장입니다." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 새 초대코드 생성 (중복 확인)
    let newInviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existingCode } = await supabase
        .from("businesses")
        .select("id")
        .eq("invite_code", newInviteCode)
        .single();
      
      if (!existingCode) break;
      newInviteCode = generateInviteCode();
      attempts++;
    }

    // 초대코드 업데이트
    const { error: updateError } = await supabase
      .from("businesses")
      .update({ invite_code: newInviteCode })
      .eq("id", body.businessId);

    if (updateError) {
      console.error("Update invite code error:", updateError);
      return new Response(
        JSON.stringify({ error: "초대코드 재발급에 실패했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 감사 로그
    await supabase.from("audit_logs").insert({
      business_id: body.businessId,
      action: "regenerate_invite_code",
      resource: "business",
      resource_id: body.businessId,
      details: {
        old_code: business.invite_code,
        new_code: newInviteCode,
      },
      level: "info",
      success: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        inviteCode: newInviteCode,
        message: "새 초대코드가 발급되었습니다. 기존 코드는 더 이상 사용할 수 없습니다.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Regenerate invite code error:", err);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
