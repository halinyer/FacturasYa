/**
 * Constructor y calculador tributario SENIAT de Facturas / Notas de Entrega para el POS (SaaS & Local).
 * Incluye:
 * - Eliminación de recargo IGTF 3% sobre divisas (conforme a normativa vigente y Decreto 4.972).
 * - Soporte para Propina Sugerida para Meseras (cálculo porcentual o monto fijo, asignación de mesera).
 * - Soporte para Método de Pago CASHEA (código de compra, cuota inicial y saldo financiado).
 * - Desglose bimonetario ($ y Bs) a tasa oficial BCV.
 */
export function buildInvoicePayload({
  cart = [],
  client = null,
  user = null,
  orderType = 'salon',
  deliveryInfo = null,
  deliveryFee = 0,
  itemsSubtotalUSD = 0,
  cartTotalUSD = 0,
  cartTotalBs = 0,
  currentRate = 876.80,
  paymentMethod = 'efectivo_usd',
  isMixedPayment = false,
  mixedPayments = null,
  isPending = false,
  pagoMovilBank = null,
  pagoMovilRef = null,
  isFiscalInvoice = false,
  loadedTableOrder = null,
  // Propina Sugerida para Meseras
  tipUSD = 0,
  tipBs = 0,
  tipPercentage = 0,
  waiterId = null,
  waiterName = null,
  // Información de Cashea BNPL
  casheaInfo = null
}) {
  const selectedClient = client || { id: 'generic', name: 'Consumidor Final', cedula: 'V-00000000', type: 'normal' };
  const isClientCongelador = selectedClient.type === 'congelador';
  const status = (isPending && isClientCongelador) ? 'pending' : 'paid';

  let finalPaymentMethod = paymentMethod;
  let finalMixedPayments = null;

  // Cálculo de Subtotal e ítems
  const subtotalItemsUSD = Number((itemsSubtotalUSD || 0).toFixed(2));
  const subtotalItemsBs = Number((subtotalItemsUSD * currentRate).toFixed(2));
  const finalDeliveryFeeUSD = orderType === 'delivery' ? Number((parseFloat(deliveryFee) || 0).toFixed(2)) : 0;
  const finalDeliveryFeeBs = Number((finalDeliveryFeeUSD * currentRate).toFixed(2));
  const baseTotalUSD = subtotalItemsUSD + finalDeliveryFeeUSD;

  // Propina de Meseras
  const numTipUSD = Number((parseFloat(tipUSD) || 0).toFixed(2));
  const numTipBs = Number((parseFloat(tipBs) || (numTipUSD * currentRate)).toFixed(2));
  const numTipPercent = Number(tipPercentage) || 0;

  // Total Final a Pagar (Subtotal + Delivery + Propina) -> Cero IGTF
  const computedTotalUSD = cartTotalUSD > 0 
    ? Number(cartTotalUSD.toFixed(2)) 
    : Number((baseTotalUSD + numTipUSD).toFixed(2));
  const computedTotalBs = cartTotalBs > 0 
    ? Number(cartTotalBs.toFixed(2)) 
    : Number((computedTotalUSD * currentRate).toFixed(2));

  let totalReceivedUSD = computedTotalUSD;

  if (isMixedPayment && mixedPayments) {
    finalPaymentMethod = 'mixto';
    const usdCash = parseFloat(mixedPayments.efectivo_usd) || 0;
    const zelle = parseFloat(mixedPayments.zelle) || 0;
    const pmBs = parseFloat(mixedPayments.pago_movil) || 0;
    const puntoBs = parseFloat(mixedPayments.punto) || 0;
    const bsCash = parseFloat(mixedPayments.efectivo_bs) || 0;
    const pmUSD = pmBs / currentRate;
    const puntoUSD = puntoBs / currentRate;
    const bsCashUSD = bsCash / currentRate;

    totalReceivedUSD = usdCash + zelle + pmUSD + puntoUSD + bsCashUSD;

    finalMixedPayments = {
      efectivo_usd: usdCash,
      zelle,
      pago_movil: pmBs,
      punto: puntoBs,
      efectivo_bs: bsCash,
      pago_movil_usd: pmUSD,
      punto_usd: puntoUSD,
      efectivo_bs_usd: bsCashUSD
    };
  }

  const changeUSD = totalReceivedUSD > computedTotalUSD ? Number((totalReceivedUSD - computedTotalUSD).toFixed(2)) : 0;
  const changeBs = Number((changeUSD * currentRate).toFixed(2));

  // Cálculos Tributarios SENIAT (16% IVA general)
  const baseImponibleUSD = Number((subtotalItemsUSD / 1.16).toFixed(2));
  const ivaUSD = Number((subtotalItemsUSD - baseImponibleUSD).toFixed(2));
  const baseImponibleBs = Number((baseImponibleUSD * currentRate).toFixed(2));
  const ivaBs = Number((ivaUSD * currentRate).toFixed(2));

  // IGTF 3% ELIMINADO: fijado en 0 en cumplimiento de normativa y solicitud comercial
  const igtfBaseUSD = 0;
  const igtfRate = 0;
  const igtfUSD = 0;
  const igtfBs = 0;
  const isIgtfExempt = true;

  const fiscalControlNumber = `00-${String(Date.now()).slice(-6)}`;

  // Normalización de mesera(o)
  const finalWaiterName = waiterName || loadedTableOrder?.waiterName || null;
  const finalWaiterId = waiterId || loadedTableOrder?.waiterId || null;

  // Normalización de Cashea BNPL
  let finalCasheaInfo = null;
  if (finalPaymentMethod === 'cashea' && casheaInfo) {
    const downUSD = Number((parseFloat(casheaInfo.downPaymentUSD) || (computedTotalUSD * 0.5)).toFixed(2));
    const downBs = Number((downUSD * currentRate).toFixed(2));
    const financedUSD = Number(Math.max(0, computedTotalUSD - downUSD).toFixed(2));
    const financedBs = Number((financedUSD * currentRate).toFixed(2));

    finalCasheaInfo = {
      code: (casheaInfo.code || '').trim().toUpperCase(),
      downPaymentPercentage: casheaInfo.downPaymentPercentage || 50,
      downPaymentUSD: downUSD,
      downPaymentBs: downBs,
      financedUSD,
      financedBs,
      downPaymentMethod: casheaInfo.downPaymentMethod || 'punto', // 'punto' | 'pago_movil' | 'efectivo_usd' | 'efectivo_bs'
      downPaymentBank: casheaInfo.downPaymentBank || null,
      downPaymentRef: casheaInfo.downPaymentRef || null
    };
  }

  return {
    clientId: selectedClient.id,
    client: selectedClient,
    clientName: selectedClient.name || 'Consumidor Final',
    clientCedula: selectedClient.cedula || 'V-00000000',
    clientRif: selectedClient.cedula || selectedClient.rif || 'V-00000000',
    clientType: selectedClient.type || 'normal',
    clientAddress: selectedClient.address || deliveryInfo?.address || null,
    clientPhone: selectedClient.phone || deliveryInfo?.phone || null,
    cashierName: user?.name || user?.username || '001',
    orderType,
    deliveryInfo: orderType === 'delivery' ? deliveryInfo : null,
    deliveryFee: finalDeliveryFeeUSD,
    items: cart.map(item => {
      const unitPriceUSD = Number(item.priceUSD || item.priceUsd || item.price || 0);
      const unitPriceBs = Number((unitPriceUSD * currentRate).toFixed(2));
      const isExempt = Boolean(item.isExempt || item.taxType === 'exento' || item.taxRate === 0);
      const taxRate = isExempt ? 0.0 : (item.taxRate !== undefined ? Number(item.taxRate) : 0.16);
      const qty = Number(item.quantity || item.qty || 1);
      return {
        productId: item.id || item.productId,
        productName: item.name || item.productName,
        quantity: qty,
        unitPrice: unitPriceUSD,
        unitPriceUSD,
        unitPriceBs,
        priceBs: unitPriceBs,
        subtotalUSD: Number((unitPriceUSD * qty).toFixed(2)),
        subtotalBs: Number((unitPriceBs * qty).toFixed(2)),
        subtotal: Number((unitPriceBs * qty).toFixed(2)),
        taxRate,
        taxType: isExempt ? 'exento' : 'general',
        modalidad: item.modalidad
      };
    }),
    subtotalUSD: subtotalItemsUSD,
    subtotalBs: subtotalItemsBs,
    baseImponibleUSD,
    baseImponibleBs,
    ivaRate: 0.16,
    ivaUSD,
    ivaBs,
    // IGTF a 0
    igtfBaseUSD,
    igtfRate,
    igtfUSD,
    igtfBs,
    isIgtfExempt,
    // Propina de Meseras
    tipUSD: numTipUSD,
    tipBs: numTipBs,
    tipPercentage: numTipPercent,
    waiterId: finalWaiterId,
    waiterName: finalWaiterName,
    // Cashea BNPL
    casheaInfo: finalCasheaInfo,
    fiscalControlNumber,
    totalUSD: computedTotalUSD,
    totalBs: computedTotalBs,
    exchangeRate: currentRate,
    paymentMethod: finalPaymentMethod,
    mixedPayments: finalMixedPayments,
    pagoMovilBank: (finalPaymentMethod === 'pago_movil' || finalPaymentMethod === 'mixto') ? (pagoMovilBank || null) : null,
    pagoMovilRef: (finalPaymentMethod === 'pago_movil' || finalPaymentMethod === 'mixto') ? (pagoMovilRef || null) : null,
    receivedAmount: status === 'pending' ? 0 : totalReceivedUSD,
    changeUSD,
    changeBs,
    status,
    isFiscalInvoice: Boolean(isFiscalInvoice),
    docType: isFiscalInvoice ? 'fiscal' : 'nota_entrega',
    tableName: loadedTableOrder?.tableName || null
  };
}
