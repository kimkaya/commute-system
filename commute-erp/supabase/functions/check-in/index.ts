// =====================================================
// 출근 처리 Edge Function
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface CheckInRequest {
  businessId: string;
  employeeId: string;
  method: "face" | "password" | "emergency" | "admin";
  deviceId?: string;
  ipAddress?: string;
  workLocation?: string;
}

Deno.serve(async (req) => {
  // CORS 프리플라이트
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
    const body = (await req.json()) as CheckInRequest;

    // 필수 필드 검증
    if (!body.businessId || !body.employeeId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 오늘 날짜
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const checkInTime = now.toTimeString().slice(0, 5); // HH:mm

    // 직원 확인
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, is_active")
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

    // 기존 출퇴근 기록 확인
    const { data: existingRecord } = await supabase
      .from("attendance_records")
      .select("id, check_in")
      .eq("business_id", body.businessId)
      .eq("employee_id", body.employeeId)
      .eq("date", today)
      .single();

    if (existingRecord?.check_in) {
      return new Response(
        JSON.stringify({ 
          error: "Already checked in",
          existingCheckIn: existingRecord.check_in 
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 출근 기록 생성 또는 업데이트
    const recordData = {
      business_id: body.businessId,
      employee_id: body.employeeId,
      date: today,
      check_in: checkInTime,
      check_in_at: now.toISOString(),
      check_in_method: body.method,
      device_id: body.deviceId || null,
      ip_address: body.ipAddress || null,
      work_location: body.workLocation || null,
      total_break_minutes: 60, // 기본 휴게시간
    };

    let result;
    
    if (existingRecord) {
      // 기존 레코드 업데이트
      const { data, error } = await supabase
        .from("attendance_records")
        .update({
          check_in: checkInTime,
          check_in_at: now.toISOString(),
          check_in_method: body.method,
          device_id: body.deviceId || null,
          ip_address: body.ipAddress || null,
        })
        .eq("id", existingRecord.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // 새 레코드 생성
      const { data, error } = await supabase
        .from("attendance_records")
        .insert(recordData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // 감사 로그 기록
    await supabase.from("audit_logs").insert({
      business_id: body.businessId,
      user_id: body.employeeId,
      user_name: employee.name,
      action: body.method === "emergency" ? "emergency_check_in" : "check_in",
      resource: "attendance",
      resource_id: result.id,
      details: {
        date: today,
        time: checkInTime,
        method: body.method,
      },
      ip_address: body.ipAddress || null,
      device_id: body.deviceId || null,
      level: body.method === "emergency" ? "warning" : "info",
      success: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        record: result,
        employee: {
          id: employee.id,
          name: employee.name,
        },
        checkInTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Check-in error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
