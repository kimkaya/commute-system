import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type CloseRequest = {
  businessId: string;
  periodId: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response("Missing Supabase env", { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const body = (await req.json()) as CloseRequest;
    if (!body.businessId || !body.periodId) {
      return new Response("Invalid payload", { status: 400 });
    }

    const { data: period, error: periodError } = await supabase
      .from("payroll_periods")
      .select("id, status")
      .eq("business_id", body.businessId)
      .eq("id", body.periodId)
      .single();

    if (periodError || !period) {
      return new Response("Period not found", { status: 404 });
    }

    if (period.status === "closed") {
      return new Response("Already closed", { status: 409 });
    }

    const { data: run, error: runError } = await supabase
      .from("payroll_runs")
      .insert({
        business_id: body.businessId,
        payroll_period_id: body.periodId,
      })
      .select("id")
      .single();

    if (runError || !run) {
      return new Response("Failed to create run", { status: 500 });
    }

    const { error: closeError } = await supabase
      .from("payroll_periods")
      .update({ status: "closed" })
      .eq("id", body.periodId)
      .eq("business_id", body.businessId);

    if (closeError) {
      return new Response("Failed to close period", { status: 500 });
    }

    return new Response(
      JSON.stringify({ runId: run.id, status: "closed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response("Server error", { status: 500 });
  }
});
