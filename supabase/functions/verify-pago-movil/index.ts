// ============================================================================
// SUPABASE EDGE FUNCTION: verify-pago-movil
// Valida referencias de Pago Móvil contra pasarela bancaria (Pabilo / Cobrix)
// con autoridad de precio en el servidor (saas_config), o registra el pago
// para aprobación en 1 clic desde el Panel Super Admin.
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
      paymentMethod = "pago_movil",
      amountBs = 0,
      rateBcv = 1,
      bankOrigin = "",
      phoneOrigin = "",
      payerDoc = "",
      referenceLast6 = ""
    } = body;

    const cleanRef = String(referenceLast6 || "").trim().slice(-8);
    if (!tenantId || !bankOrigin || cleanRef.length < 4) {
      return new Response(
        JSON.stringify({ success: false, error: "Datos de Pago Móvil incompletos." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 0. Autoridad de Precio en el Servidor: leer saas_config directamente desde PostgreSQL
    const { data: saasConfig } = await supabase
      .from("saas_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const validPlan = plan === "annual" ? "annual" : "monthly";
    const officialUsd = validPlan === "annual"
      ? Number(saasConfig?.annual_price_usd || 200)
      : Number(saasConfig?.monthly_price_usd || 30);
    const officialRate = Number(rateBcv) > 1 ? Number(rateBcv) : Number(saasConfig?.bcv_rate || 876.80);
    const expectedBs = Math.round(officialUsd * officialRate * 100) / 100;
    const reportedBs = Number(amountBs) > 0 ? Number(amountBs) : expectedBs;

    // Candado anti-fraude: si intentan reportar un monto en Bs menor al 95% del precio oficial, rechazar de inmediato
    if (paymentMethod === "pago_movil" && reportedBs < expectedBs * 0.95) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `El monto reportado (Bs. ${reportedBs.toFixed(2)}) no coincide con el monto oficial del plan (Bs. ${expectedBs.toFixed(2)}).`
        }),
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

    const daysToAdd = validPlan === "annual" ? 365 : 30;

    // 2. Insertar el registro del pago en estado inicial 'pending' con precio oficial
    const { data: paymentRow, error: insertError } = await supabase
      .from("subscription_payments")
      .insert({
        tenant_id: tenantId,
        tenant_name: tenantName || "Restaurante",
        plan: validPlan,
        payment_method: paymentMethod,
        days_to_add: daysToAdd,
        amount_usd: officialUsd,
        amount_bs: expectedBs,
        rate_bcv: officialRate,
        bank_origin: bankOrigin,
        phone_origin: phoneOrigin,
        payer_doc: String(payerDoc || "").toUpperCase().trim(),
        reference_last6: cleanRef,
        status: "pending",
        verified_by: "pending"
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 3. Si tienes configurada la API de Pabilo / Cobrix y es Pago Móvil, consulta el banco automáticamente
    if (bankApiUrl && bankApiKey && paymentMethod === "pago_movil") {
      const gatewayRes = await fetch(bankApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${bankApiKey}`
        },
        body: JSON.stringify({
          bank_origin: bankOrigin,
          phone_origin: phoneOrigin,
          payer_doc: payerDoc,
          reference: cleanRef,
          amount_bs: expectedBs,
          min_amount_bs: Math.floor(expectedBs * 0.97)
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

    // 4. Modo Semi-Automático (Bancamiga Personal P2P / Binance Pay):
    // Queda listo en el Panel Super Admin para que lo apruebes con 1 clic
    return new Response(
      JSON.stringify({
        success: true,
        status: "PENDING_VERIFICATION",
        paymentId: paymentRow.id,
        payment: paymentRow,
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
