// =====================================================
// 퇴근 처리 Edge Function
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface CheckOutRequest {
  businessId: string;
  employeeId: string;
  method: "face" | "password" | "emergency" | "admin";
  deviceId?: string;
  ipAddress?: string;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function calculateWorkMinutes(checkIn: string, checkOut: string, breakMinutes: number): number {
  const inMin = timeToMinutes(checkIn);
  let outMin = timeToMinutes(checkOut);
  
  // 자정을 넘긴 경우
  if (outMin < inMin) {
    outMin += 24 * 60;
  }
  
  return Math.max(0, outMin - inMin - breakMinutes);
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
    const body = (await req.json()) as CheckOutRequest;

    if (!body.businessId || !body.employeeId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const checkOutTime = now.toTimeString().slice(0, 5);

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

    // 오늘 출퇴근 기록 확인
    const { data: record, error: recordError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("business_id", body.businessId)
      .eq("employee_id", body.employeeId)
      .eq("date", today)
      .single();

    if (recordError || !record) {
      return new Response(
        JSON.stringify({ error: "No check-in record found for today" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!record.check_in) {
      return new Response(
        JSON.stringify({ error: "Must check in before checking out" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (record.check_out) {
      return new Response(
        JSON.stringify({ 
          error: "Already checked out",
          existingCheckOut: record.check_out 
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 근무시간 계산
    const workMinutes = calculateWorkMinutes(
      record.check_in,
      checkOutTime,
      record.total_break_minutes || 60
    );

    // 퇴근 기록 업데이트
    const { data: updatedRecord, error: updateError } = await supabase
      .from("attendance_records")
      .update({
        check_out: checkOutTime,
        check_out_at: now.toISOString(),
        check_out_method: body.method,
      })
      .eq("id", record.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 감사 로그 기록
    await supabase.from("audit_logs").insert({
      business_id: body.businessId,
      user_id: body.employeeId,
      user_name: employee.name,
      action: body.method === "emergency" ? "emergency_check_out" : "check_out",
      resource: "attendance",
      resource_id: record.id,
      details: {
        date: today,
        checkIn: record.check_in,
        checkOut: checkOutTime,
        workMinutes,
        method: body.method,
      },
      ip_address: body.ipAddress || null,
      device_id: body.deviceId || null,
      level: body.method === "emergency" ? "warning" : "info",
      success: true,
    });

    // 근무시간을 시간:분 형식으로 변환
    const workHours = Math.floor(workMinutes / 60);
    const workMins = workMinutes % 60;
    const workDuration = `${workHours}시간 ${workMins}분`;

    return new Response(
      JSON.stringify({
        success: true,
        record: updatedRecord,
        employee: {
          id: employee.id,
          name: employee.name,
        },
        checkInTime: record.check_in,
        checkOutTime,
        workMinutes,
        workDuration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Check-out error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
