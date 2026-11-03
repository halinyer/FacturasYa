// ============================================================================
// SUPABASE EDGE FUNCTION: verify-pago-movil
// Valida referencias de Pago Móvil contra pasarela bancaria (Pabilo / Cobrix)
// o registra el pago para aprobación en 1 clic desde el Panel Super Admin.
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const bankApiUrl = Deno.env.get("BANK_GATEWAY_API_URL") ?? ""; // Ej: URL de Pabilo o Cobrix
    const bankApiKey = Deno.env.get("BANK_GATEWAY_API_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      tenantId,
      tenantName,
      plan = "monthly",
      amountUsd = 30,
      amountBs = 0,
      rateBcv = 1,
      bankOrigin = "",
      phoneOrigin = "",
      referenceLast6 = ""
    } = body;

    const cleanRef = String(referenceLast6 || "").trim().slice(-6);
    if (!tenantId || !bankOrigin || !phoneOrigin || cleanRef.length < 4) {
      return new Response(
        JSON.stringify({ success: false, error: "Datos de Pago Móvil incompletos." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Verificar que la referencia no haya sido usada previamente
    const { data: existingRef } = await supabase
      .from("subscription_payments")
      .select("id, status")
      .eq("reference_last6", cleanRef)
      .eq("bank_origin", bankOrigin)
      .in("status", ["approved", "pending"])
      .maybeSingle();

    if (existingRef) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `La referencia #${cleanRef} ya fue registrada anteriormente.`
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const daysToAdd = plan === "annual" ? 365 : 30;

    // 2. Insertar el registro del pago en estado inicial 'pending'
    const { data: paymentRow, error: insertError } = await supabase
      .from("subscription_payments")
      .insert({
        tenant_id: tenantId,
        tenant_name: tenantName || "Restaurante",
        plan,
        days_to_add: daysToAdd,
        amount_usd: Number(amountUsd),
        amount_bs: Number(amountBs),
        rate_bcv: Number(rateBcv),
        bank_origin: bankOrigin,
        phone_origin: phoneOrigin,
        reference_last6: cleanRef,
        status: "pending"
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 3. Si tienes configurada la API de Pabilo / Cobrix, consulta el banco automáticamente
    if (bankApiUrl && bankApiKey) {
      const gatewayRes = await fetch(bankApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${bankApiKey}`
        },
        body: JSON.stringify({
          bank_origin: bankOrigin,
          phone_origin: phoneOrigin,
          reference: cleanRef,
          amount_bs: Number(amountBs)
        })
      });

      const gatewayJson = await gatewayRes.json();

      if (gatewayJson && gatewayJson.status === "APPROVED") {
        // Desbloqueo automático e inmediato en base de datos (+30 o +365 días)
        const { data: approval } = await supabase.rpc("approve_subscription_payment", {
          p_payment_id: paymentRow.id,
          p_verified_by: "api_auto"
        });

        return new Response(
          JSON.stringify({
            success: true,
            status: "APPROVED",
            message: "¡Pago Móvil verificado automáticamente! Tu suscripción ha sido renovada.",
            approval
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            status: "NOT_FOUND",
            error: "No se encontró el movimiento bancario con esa referencia y monto exacto."
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 4. Modo Semi-Automático (sin API bancaria contratada aún):
    // Queda listo en el Panel Super Admin para que lo apruebes con 1 clic
    return new Response(
      JSON.stringify({
        success: true,
        status: "PENDING_VERIFICATION",
        paymentId: paymentRow.id,
        message: "Pago reportado con éxito. En breve se activará tu suscripción en tiempo real."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
