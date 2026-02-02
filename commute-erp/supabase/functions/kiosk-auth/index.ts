// =====================================================
// 키오스크 기기 인증 Edge Function
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface AuthRequest {
  deviceCode?: string;
  device_code?: string;
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
    const body = (await req.json()) as AuthRequest;

    // snake_case와 camelCase 모두 지원
    const deviceCode = body.deviceCode || body.device_code;

    if (!deviceCode) {
      return new Response(
        JSON.stringify({ error: "기기코드를 입력해주세요." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 기기 조회
    const { data: device, error: deviceError } = await supabase
      .from("kiosk_devices")
      .select(`
        id,
        business_id,
        device_name,
        device_code,
        location,
        status,
        is_registered,
        businesses:business_id (
          id,
          name,
          company_code,
          is_active
        )
      `)
      .eq("device_code", deviceCode.toUpperCase())
      .single();

    if (deviceError || !device) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "유효하지 않은 기기코드입니다." 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (device.status !== 'approved') {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "승인되지 않은 기기입니다." 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const business = device.businesses as { id: string; name: string; company_code: string; is_active: boolean };
    
    if (!business || !business.is_active) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "비활성화된 사업장입니다." 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 기기 등록 완료 처리 & 마지막 연결 시간 업데이트
    await supabase
      .from("kiosk_devices")
      .update({
        is_registered: true,
        last_connected_at: new Date().toISOString(),
      })
      .eq("id", device.id);

    // 감사 로그
    await supabase.from("audit_logs").insert({
      business_id: device.business_id,
      action: "kiosk_auth",
      resource: "kiosk_device",
      resource_id: device.id,
      details: {
        device_code: deviceCode,
        device_name: device.device_name,
      },
      level: "info",
      success: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        deviceId: device.id,
        device_id: device.id,
        deviceCode: device.device_code,
        device_code: device.device_code,
        deviceName: device.device_name,
        device_name: device.device_name,
        location: device.location,
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
    console.error("Kiosk auth error:", err);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
