import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type ComputeRequest = {
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
    const body = (await req.json()) as ComputeRequest;
    if (!body.businessId || !body.periodId) {
      return new Response("Invalid payload", { status: 400 });
    }

    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("id")
      .eq("business_id", body.businessId)
      .eq("status", "active");

    if (employeesError) {
      return new Response("Failed to read employees", { status: 500 });
    }

    const lineItems = [{ key: "base", label: "Base Pay", amount: 0 }];

    const inserts = (employees ?? []).map((employee) => ({
      business_id: body.businessId,
      payroll_run_id: body.periodId,
      employee_id: employee.id,
      line_items: lineItems,
    }));

    if (inserts.length > 0) {
      const { error } = await supabase.from("payroll_lines").insert(inserts);
      if (error) {
        return new Response("Failed to insert payroll lines", { status: 500 });
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response("Server error", { status: 500 });
  }
});
