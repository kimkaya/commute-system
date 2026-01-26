import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type MatchRequest = {
  businessId: string;
  embedding: number[];
};

type FaceTemplate = {
  employee_id: string;
  embedding: number[];
};

const threshold = Number(Deno.env.get("FACE_MATCH_THRESHOLD") ?? "0.76");

const cosineSimilarity = (a: number[], b: number[]) => {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    aNorm += a[i] * a[i];
    bNorm += b[i] * b[i];
  }
  if (aNorm === 0 || bNorm === 0) return 0;
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
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
    const body = (await req.json()) as MatchRequest;
    if (!body.businessId || !body.embedding?.length) {
      return new Response("Invalid payload", { status: 400 });
    }

    const { data, error } = await supabase
      .from("employee_face_templates")
      .select("employee_id, embedding")
      .eq("business_id", body.businessId);

    if (error) {
      return new Response(error.message, { status: 400 });
    }

    let bestScore = 0;
    let bestEmployeeId: string | null = null;

    (data as FaceTemplate[]).forEach((row) => {
      const score = cosineSimilarity(body.embedding, row.embedding);
      if (score > bestScore) {
        bestScore = score;
        bestEmployeeId = row.employee_id;
      }
    });

    if (!bestEmployeeId || bestScore < threshold) {
      return new Response(
        JSON.stringify({ match: false, score: bestScore }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ match: true, employeeId: bestEmployeeId, score: bestScore }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response("Server error", { status: 500 });
  }
});
