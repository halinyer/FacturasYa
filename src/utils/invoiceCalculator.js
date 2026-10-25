/**
 * Constructor y calculador tributario SENIAT de Facturas / Notas de Entrega para el POS.
 * Centraliza el cálculo de Base Imponible, IVA (16%), IGTF (3% sobre pagos en divisas),
 * desglose de pagos mixtos y normalización de datos del cliente.
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
  loadedTableOrder = null
}) {
  const selectedClient = client || { id: 'generic', name: 'Consumidor Final', cedula: 'V-00000000', type: 'normal' };
  const isClientCongelador = selectedClient.type === 'congelador';
  const status = (isPending && isClientCongelador) ? 'pending' : 'paid';

  let finalPaymentMethod = paymentMethod;
  let finalMixedPayments = null;
  let totalReceivedUSD = cartTotalUSD;

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

  const changeUSD = totalReceivedUSD > cartTotalUSD ? Number((totalReceivedUSD - cartTotalUSD).toFixed(2)) : 0;
  const changeBs = Number((changeUSD * currentRate).toFixed(2));

  // SENIAT Venezuelan Fiscal Calculations
  const subtotalItemsUSD = itemsSubtotalUSD;
  const baseImponibleUSD = Number((subtotalItemsUSD / 1.16).toFixed(2));
  const ivaUSD = Number((subtotalItemsUSD - baseImponibleUSD).toFixed(2));
  const baseImponibleBs = Number((baseImponibleUSD * currentRate).toFixed(2));
  const ivaBs = Number((ivaUSD * currentRate).toFixed(2));

  // IGTF 3% calculation: applies ONLY to foreign currency payments (efectivo_usd, zelle, or foreign fraction of mixed)
  let igtfBaseUSD = 0;
  if (finalPaymentMethod === 'efectivo_usd' || finalPaymentMethod === 'zelle') {
    igtfBaseUSD = Number(cartTotalUSD.toFixed(2));
  } else if (finalPaymentMethod === 'mixto' && finalMixedPayments) {
    igtfBaseUSD = Number(((parseFloat(finalMixedPayments.efectivo_usd) || 0) + (parseFloat(finalMixedPayments.zelle) || 0)).toFixed(2));
  }
  const igtfUSD = Number((igtfBaseUSD * 0.03).toFixed(2));
  const igtfBs = Number((igtfUSD * currentRate).toFixed(2));
  const isIgtfExempt = igtfBaseUSD === 0;

  const fiscalControlNumber = `00-${String(Date.now()).slice(-6)}`;

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
    deliveryFee: orderType === 'delivery' ? deliveryFee : 0,
    items: cart.map(item => {
      const unitPriceUSD = Number(item.priceUSD || item.price || 0);
      const unitPriceBs = Number((unitPriceUSD * currentRate).toFixed(2));
      const isExempt = Boolean(item.isExempt || item.taxType === 'exento' || item.taxRate === 0);
      const taxRate = isExempt ? 0.0 : (item.taxRate !== undefined ? Number(item.taxRate) : 0.16);
      return {
        productId: item.id,
        productName: item.name,
        quantity: Number(item.quantity || 1),
        unitPrice: unitPriceUSD,
        unitPriceUSD,
        unitPriceBs,
        priceBs: unitPriceBs,
        subtotalUSD: Number((unitPriceUSD * item.quantity).toFixed(2)),
        subtotalBs: Number((unitPriceBs * item.quantity).toFixed(2)),
        subtotal: Number((unitPriceBs * item.quantity).toFixed(2)),
        taxRate,
        taxType: isExempt ? 'exento' : 'general'
      };
    }),
    subtotalUSD: Number(subtotalItemsUSD.toFixed(2)),
    subtotalBs: Number((subtotalItemsUSD * currentRate).toFixed(2)),
    baseImponibleUSD,
    baseImponibleBs,
    ivaRate: 0.16,
    ivaUSD,
    ivaBs,
    igtfBaseUSD,
    igtfRate: 0.03,
    igtfUSD,
    igtfBs,
    isIgtfExempt,
    fiscalControlNumber,
    totalUSD: Number(cartTotalUSD.toFixed(2)),
    totalBs: Number(cartTotalBs.toFixed(2)),
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
    tableName: loadedTableOrder?.tableName || null,
    waiterName: loadedTableOrder?.waiterName || null
  };
}
