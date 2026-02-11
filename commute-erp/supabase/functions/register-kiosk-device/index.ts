// =====================================================
// 키오스크 기기 등록 Edge Function
// 관리자가 기기를 등록하고 기기코드 발급
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface RegisterRequest {
  businessId: string;
  deviceName: string;
  location?: string;
  description?: string;
}

// 랜덤 기기코드 생성 (8자리)
function generateDeviceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
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

    if (!body.businessId || !body.deviceName) {
      return new Response(
        JSON.stringify({ error: "필수 항목을 입력해주세요." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 사업장 확인
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, name, is_active")
      .eq("id", body.businessId)
      .single();

    if (bizError || !business) {
      return new Response(
        JSON.stringify({ error: "존재하지 않는 사업장입니다." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!business.is_active) {
      return new Response(
        JSON.stringify({ error: "비활성화된 사업장입니다." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 기기코드 생성 (중복 확인)
    let deviceCode = generateDeviceCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existingDevice } = await supabase
        .from("kiosk_devices")
        .select("id")
        .eq("device_code", deviceCode)
        .single();
      
      if (!existingDevice) break;
      deviceCode = generateDeviceCode();
      attempts++;
    }

    // 기기 등록
    const { data: device, error: deviceError } = await supabase
      .from("kiosk_devices")
      .insert({
        business_id: body.businessId,
        device_name: body.deviceName,
        device_code: deviceCode,
        location: body.location || null,
        status: 'approved',
        is_registered: false,
      })
      .select()
      .single();

    if (deviceError || !device) {
      console.error("Device registration error:", deviceError);
      return new Response(
        JSON.stringify({ error: "기기 등록에 실패했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 감사 로그
    await supabase.from("audit_logs").insert({
      business_id: body.businessId,
      action: "kiosk_register",
      resource: "kiosk_device",
      resource_id: device.id,
      details: {
        device_name: body.deviceName,
        device_code: deviceCode,
        location: body.location,
      },
      level: "info",
      success: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        deviceId: device.id,
        deviceName: body.deviceName,
        deviceCode: deviceCode,
        location: body.location,
        message: "기기가 등록되었습니다. 키오스크에서 기기코드를 입력하세요.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Register kiosk device error:", err);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
