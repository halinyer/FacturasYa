import { CLIENT_CONFIG, getActiveFranchise } from '../config/clientConfig';

export const formatVE = (num, decimals = 2) => {
  const val = Number(num) || 0;
  return val.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Obtiene el perfil fiscal dinámico de la empresa/franquicia activa
 */
export function getFiscalCompanyProfile(customSettings = {}) {
  let franchise = CLIENT_CONFIG;
  try {
    if (typeof getActiveFranchise === 'function') {
      franchise = getActiveFranchise();
    }
  } catch (e) {
    // fallback a CLIENT_CONFIG
  }

  let storedFiscal = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('pos_fiscal_settings');
      if (raw) storedFiscal = JSON.parse(raw);
    } catch (e) {
      // ignore
    }
  }

  const legalName = customSettings.legalName || customSettings.companyName || storedFiscal.legalName || franchise?.legalName || CLIENT_CONFIG.legalName || 'MI NEGOCIO C.A.';
  const rif = customSettings.rif || storedFiscal.rif || franchise?.rif || CLIENT_CONFIG.rif || 'J-00000000-0';
  const fiscalAddress = customSettings.fiscalAddress || storedFiscal.fiscalAddress || franchise?.address || (franchise?.addressLines ? franchise.addressLines.join(', ') : 'Caracas, Venezuela');
  const taxpayerType = customSettings.taxpayerType || storedFiscal.taxpayerType || franchise?.taxpayerType || 'ORDINARIO';
  const machineNumber = customSettings.machineNumber || storedFiscal.registeredMachineNumber || franchise?.fiscalMachine?.serial || 'N/A';

  return {
    legalName,
    rif,
    fiscalAddress,
    taxpayerType,
    machineNumber
  };
}

export function exportSeniatBookToCSV({
  isSales,
  selectedMonth,
  selectedYear,
  selectedFortnight,
  salesBookData = [],
  salesTotals = {},
  purchasesBookData = [],
  purchasesTotals = {},
  companyName,
  rif,
  legalName
}) {
  const companyProfile = getFiscalCompanyProfile({ legalName: legalName || companyName, rif });
  const periodLabel = `${selectedMonth}-${selectedYear}_${selectedFortnight}`;
  const cleanRif = (companyProfile.rif || '').replace(/[^A-Za-z0-9]/g, '');
  const filename = `Libro_de_${isSales ? 'Ventas' : 'Compras'}_SENIAT_${cleanRif}_${periodLabel}.csv`;

  const lines = [];

  lines.push(`"${companyProfile.legalName}"`);
  lines.push(`"RIF: ${companyProfile.rif}"`);
  lines.push(`"LIBRO DE ${isSales ? 'VENTAS' : 'COMPRAS'} (IVA) - FORMATO SENIAT"`);
  lines.push(`"Período Fiscal: Mes ${selectedMonth}/${selectedYear} (${selectedFortnight === 'all' ? 'Mes Completo' : selectedFortnight === 'q1' ? '1ra Quincena' : '2da Quincena'})"`);
  lines.push('"Moneda de Registro: Bolívares (Bs.)"');
  lines.push('');

  if (isSales) {
    const headers = [
      'Nº Operación',
      'Fecha',
      'RIF / C.I. Cliente',
      'Nombre o Razón Social',
      'Tipo de Cliente',
      'Nº Factura',
      'Nº Control Fiscal',
      'Tipo Trans.',
      'Factura Afectada',
      'Total Ventas Incl. IVA (Bs.)',
      'Ventas Exentas (Bs.)',
      'Base Imponible G (Bs.)',
      '% Alícuota',
      'Impuesto IVA (Débito Fiscal Bs.)',
      'IGTF 3% Percibido (Bs.)',
      'IVA Retenido (Bs.)',
      'Ref. USD ($)'
    ];
    lines.push(headers.map(h => `"${h}"`).join(';'));

    salesBookData.forEach(row => {
      const line = [
        row.op,
        `"${row.dateFormatted}"`,
        `"${row.clientRif}"`,
        `"${(row.clientName || '').replace(/"/g, '""')}"`,
        `"${row.clientType || ''}"`,
        `"${row.invoiceNumber || ''}"`,
        `"${row.controlNumber || ''}"`,
        `"${row.transactionType || '01-REG'}"`,
        `"${row.affectedInvoice || ''}"`,
        `"${formatVE(row.totalBs || row.totalVentasBs)}"`,
        `"${formatVE(row.exemptBs)}"`,
        `"${formatVE(row.baseBs || row.taxableBaseBs)}"`,
        '"16%"',
        `"${formatVE(row.ivaBs)}"`,
        `"${formatVE(row.igtfBs)}"`,
        `"${formatVE(row.ivaRetainedBs)}"`,
        `"${Number(row.totalUSD || 0).toFixed(2)}"`
      ];
      lines.push(line.join(';'));
    });

    lines.push('');
    const totLine = [
      '"TOTALES GENERALES"',
      '""', '""', '""', '""', '""', '""', '""', '""',
      `"${formatVE(salesTotals.totalBs || salesTotals.totalVentasBs)}"`,
      `"${formatVE(salesTotals.exemptBs)}"`,
      `"${formatVE(salesTotals.baseBs || salesTotals.taxableBaseBs)}"`,
      '""',
      `"${formatVE(salesTotals.ivaBs)}"`,
      `"${formatVE(salesTotals.igtfBs)}"`,
      '"0,00"',
      `"${Number(salesTotals.totalUSD || 0).toFixed(2)}"`
    ];
    lines.push(totLine.join(';'));
  } else {
    const headers = [
      'Nº Operación',
      'Fecha',
      'RIF Proveedor',
      'Nombre o Razón Social Proveedor',
      'Nº Factura',
      'Nº Control Fiscal',
      'Tipo Trans.',
      'Factura Afectada',
      'Total Compras Incl. IVA (Bs.)',
      'Compras Exentas (Bs.)',
      'Base Imponible G (Bs.)',
      '% Alícuota',
      'Impuesto IVA (Crédito Fiscal Bs.)',
      'IVA Retenido (Bs.)',
      'Nº Comp. Retención',
      'IGTF (Bs.)',
      'Ref. USD ($)',
      'Categoría'
    ];
    lines.push(headers.map(h => `"${h}"`).join(';'));

    purchasesBookData.forEach(row => {
      const line = [
        row.op,
        `"${row.dateFormatted}"`,
        `"${row.supplierRif}"`,
        `"${(row.supplierName || '').replace(/"/g, '""')}"`,
        `"${row.invoiceNumber}"`,
        `"${row.controlNumber}"`,
        `"${row.transactionType}"`,
        `"${row.affectedInvoice}"`,
        `"${formatVE(row.totalBs || row.totalAmountBs)}"`,
        `"${formatVE(row.exemptBs || row.exemptAmountBs)}"`,
        `"${formatVE(row.baseBs || row.taxableBaseBs)}" `,
        '"16%"',
        `"${formatVE(row.ivaBs)}"`,
        `"${formatVE(row.ivaRetainedBs)}"`,
        `"${row.retentionNumber}"`,
        `"${formatVE(row.igtfBs)}"`,
        `"${Number(row.totalUSD || 0).toFixed(2)}"`,
        `"${row.category}"`
      ];
      lines.push(line.join(';'));
    });

    lines.push('');
    const totLine = [
      '"TOTALES GENERALES"',
      '""', '""', '""', '""', '""', '""', '""',
      `"${formatVE(purchasesTotals.totalBs || purchasesTotals.totalAmountBs)}"`,
      `"${formatVE(purchasesTotals.exemptBs || purchasesTotals.exemptAmountBs)}"`,
      `"${formatVE(purchasesTotals.baseBs || purchasesTotals.taxableBaseBs)}"`,
      '""',
      `"${formatVE(purchasesTotals.ivaBs)}"`,
      `"${formatVE(purchasesTotals.ivaRetainedBs)}"`,
      '""',
      '"0,00"',
      `"${Number(purchasesTotals.totalUSD || 0).toFixed(2)}"`,
      '""'
    ];
    lines.push(totLine.join(';'));
  }

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return filename;
}


export function exportZReportsToCSV({
  selectedMonth,
  selectedYear,
  selectedFortnight = 'all',
  zRecords = [],
  zReports = [],
  machineNumber = '',
  rif = '',
  legalName = ''
}) {
  const records = (zRecords && zRecords.length > 0) ? zRecords : (zReports || []);
  const companyProfile = getFiscalCompanyProfile({ legalName, rif, machineNumber });
  const cleanRif = (companyProfile.rif || '').replace(/[^A-Za-z0-9]/g, '');
  const filename = `Libro_de_Ventas_Reportes_Z_SENIAT_${cleanRif}_${selectedMonth}-${selectedYear}.csv`;
  const lines = [];

  lines.push(`"${companyProfile.legalName}"`);
  lines.push(`"RIF: ${companyProfile.rif}"`);
  lines.push(`"LIBRO DE VENTAS (IVA) - CONSOLIDADO DIARIO POR REPORTES Z DE MAQUINA FISCAL"`);
  lines.push(`"Base Legal: Providencia Administrativa SENIAT SNAT/2011/00071 (Articulos 77 y 78)"`);
  lines.push(`"Periodo Fiscal: Mes ${selectedMonth}/${selectedYear} (${selectedFortnight === 'all' ? 'Mes Completo' : selectedFortnight === 'q1' ? '1ra Quincena' : '2da Quincena'})"`);
  lines.push(`"Serial Maquina Fiscal: ${companyProfile.machineNumber || 'N/A'}"`);
  lines.push('"Moneda de Registro: Bolivares (Bs.)"');
  lines.push('');

  const headers = [
    'N Operacion',
    'Fecha Z',
    'N Reporte Z',
    'Serial Maquina Fiscal',
    'Primera Factura (Serie Desde)',
    'Ultima Factura (Serie Hasta)',
    'Cantidad de Facturas',
    'Total Ventas Incl. IVA (Bs.)',
    'Ventas Exentas (Bs.)',
    'Base Imponible G 16% (Bs.)',
    '% Alicuota',
    'Impuesto Debito Fiscal IVA 16% (Bs.)',
    'Base Imponible R 8% (Bs.)',
    'IVA Reducido 8% (Bs.)',
    'Base Imponible A 31% (Bs.)',
    'IVA Adicional 31% (Bs.)',
    'Devoluciones / Notas Credito (Bs.)',
    'Total Ventas Netas (Bs.)'
  ];
  lines.push(headers.map(h => `"${h}"`).join(';'));

  let op = 1;
  let totSales = 0;
  let totExempt = 0;
  let totBase16 = 0;
  let totTax16 = 0;
  let totBase8 = 0;
  let totTax8 = 0;
  let totBaseAdd = 0;
  let totTaxAdd = 0;
  let totDevs = 0;

  records.forEach(z => {
    const s = Number(z.totalSalesBs || z.total_daily_sales_bs || z.totalBs || z.total || 0);
    const ex = Number(z.exemptSalesBs || z.exemptBs || z.exentoBs || 0);
    const b16 = Number(z.baseGeneral16Bs || z.taxableBaseBs || z.baseBs || (s > 0 ? (s - ex) / 1.16 : 0));
    const t16 = Number(z.taxGeneral16Bs || z.ivaBs || z.iva16Bs || (b16 * 0.16));
    const b8 = Number(z.baseReduced8Bs || 0);
    const t8 = Number(z.taxReduced8Bs || 0);
    const bAdd = Number(z.baseAdditionalBs || 0);
    const tAdd = Number(z.taxAdditionalBs || 0);
    const dev = Number(z.devolutionsBs || 0);
    const net = s - dev;

    totSales += s;
    totExempt += ex;
    totBase16 += b16;
    totTax16 += t16;
    totBase8 += b8;
    totTax8 += t8;
    totBaseAdd += bAdd;
    totTaxAdd += tAdd;
    totDevs += dev;

    const row = [
      op++,
      `"${z.zDate || z.date || z.z_date || ''}"`,
      `"Z-${String(z.zNumber || z.z_number || op - 1).padStart(4, '0')}"`,
      `"${z.registeredMachineNumber || companyProfile.machineNumber || ''}"`,
      `"${z.firstInvoiceNumber ? String(z.firstInvoiceNumber).padStart(8, '0') : '00000001'}"`,
      `"${String(z.lastInvoiceNumber || z.firstInvoiceNumber || 1).padStart(8, '0')}"`,
      `"${z.invoiceCount !== undefined ? z.invoiceCount : 1}"`,
      `"${formatVE(s)}"`,
      `"${formatVE(ex)}"`,
      `"${formatVE(b16)}"`,
      '"16%"',
      `"${formatVE(t16)}"`,
      `"${formatVE(b8)}"`,
      `"${formatVE(t8)}"`,
      `"${formatVE(bAdd)}"`,
      `"${formatVE(tAdd)}"`,
      `"${formatVE(dev)}"`,
      `"${formatVE(net)}"`
    ];
    lines.push(row.join(';'));
  });

  lines.push('');
  const totLine = [
    '"TOTALES GENERALES (FORMA 30 SENIAT)"',
    '""', '""', '""', '""', '""', '""',
    `"${formatVE(totSales)}"`,
    `"${formatVE(totExempt)}"`,
    `"${formatVE(totBase16)}"`,
    '""',
    `"${formatVE(totTax16)}"`,
    `"${formatVE(totBase8)}"`,
    `"${formatVE(totTax8)}"`,
    `"${formatVE(totBaseAdd)}"`,
    `"${formatVE(totTaxAdd)}"`,
    `"${formatVE(totDevs)}"`,
    `"${formatVE(totSales - totDevs)}"`
  ];
  lines.push(totLine.join(';'));

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return filename;
}

/**
 * EXPORTADOR DE PLANTILLA EXACTA OFICIAL: "COMPRA VENTAS OCT - Resumen.csv"
 * Autoliquidación mensual del IVA (Forma 30 SENIAT)
 * Reproduce las 52 líneas exactas con comas, formato de moneda venezolano y valores dinámicos.
 */
export function exportSeniatResumenCompraVentaCSV({
  selectedMonth = '10',
  selectedYear = '2026',
  selectedFortnight = 'all',
  customDateRange,
  companyName,
  legalName,
  rif,
  fiscalAddress,
  taxpayerType,
  // Ventas (Débitos Fiscales)
  exemptSalesBs = 0,
  exportSalesBs = 0,
  baseGeneral16Bs = 0,
  taxGeneral16Bs = 0,
  baseAdditionalBs = 0,
  taxAdditionalBs = 0,
  baseReduced8Bs = 0,
  taxReduced8Bs = 0,
  adjustmentsDebitsBs = 0,
  exoneratedDebitsBs = 0,
  // Compras (Créditos Fiscales)
  exemptPurchasesBs = 0,
  baseImportsGeneralBs = 0,
  taxImportsGeneralBs = 0,
  baseImportsAddBs = 0,
  taxImportsAddBs = 0,
  baseImportsRedBs = 0,
  taxImportsRedBs = 0,
  basePurchasesGeneralBs = 0,
  taxPurchasesGeneralBs = 0,
  basePurchasesAddBs = 0,
  taxPurchasesAddBs = 0,
  basePurchasesRedBs = 0,
  taxPurchasesRedBs = 0,
  deductibleCreditsBs = 0,
  prorataCreditsBs = 0,
  totalDeductibleCreditsBs = 0,
  previousMonthExcessCreditBs = 0,
  exportRefundRequestedBs = 0,
  exoneratedRefundRequestedBs = 0,
  adjustmentsCreditsBs = 0,
  exoneratedDebitsCertBs = 0,
  // Retenciones
  retencionesAcumuladas = 0,
  retencionesPeriodo = 0,
  retencionesDescontadas = 0,
  saldoRetenciones = 0
}) {
  const companyProfile = getFiscalCompanyProfile({
    legalName: legalName || companyName,
    rif,
    fiscalAddress,
    taxpayerType
  });

  const m = String(selectedMonth).padStart(2, '0');
  const y = selectedYear || new Date().getFullYear();

  let startDay = '01';
  let endDay = '31';
  if (selectedFortnight === 'q1') {
    startDay = '01';
    endDay = '15';
  } else if (selectedFortnight === 'q2') {
    startDay = '16';
    endDay = String(new Date(y, parseInt(m, 10), 0).getDate()).padStart(2, '0');
  } else {
    startDay = '01';
    endDay = String(new Date(y, parseInt(m, 10), 0).getDate()).padStart(2, '0');
  }

  const dateRangeStr = customDateRange || `Del ${startDay}-${m}-${y} Al ${endDay}-${m}-${y}`;

  const monthNames = {
    '01': 'ENE', '02': 'FEB', '03': 'MAR', '04': 'ABR',
    '05': 'MAY', '06': 'JUN', '07': 'JUL', '08': 'AGO',
    '09': 'SEP', '10': 'OCT', '11': 'NOV', '12': 'DIC'
  };
  const mCode = monthNames[m] || m;
  const filename = `COMPRA VENTAS ${mCode} - Resumen.csv`;

  // Formateador exacto para la plantilla: decimales con coma, miles con punto, entre comillas dobles
  const fmt = (val) => {
    const n = Number(val) || 0;
    return `"${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`;
  };

  const q = (str) => {
    if (!str) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const lines = [];

  // Fila 1: ,,,,
  lines.push(',,,,');

  // Filas 2-3: RAZON SOCIAL DEL CONTRIBUYENTE, Nº DE RIF
  lines.push(',,RAZON SOCIAL DEL CONTRIBUYENTE,Nº DE RIF,');
  lines.push(`,,${q(companyProfile.legalName)},${companyProfile.rif},`);

  // Filas 4-6: DIRECCION FISCAL, TIPO DE CONTRIBUYENTE
  lines.push(',,,,');
  lines.push(',,DIRECCION FISCAL,TIPO DE CONTRIBUYENTE,');
  lines.push(`,,${q(companyProfile.fiscalAddress)},${companyProfile.taxpayerType},`);

  // Filas 7-10: RESUMEN DE LIBRO DE COMPRA Y VENTAS
  lines.push(',,,,');
  lines.push(',,RESUMEN DE LIBRO DE COMPRA Y VENTAS,,');
  lines.push(`,,${dateRangeStr},,`);
  lines.push(',,,,');

  // Fila 11: DEBITOS FISCALES
  lines.push(',N°,DEBITOS FISCALES,BASE IMPONIBLE,DEBITO FISCAL');

  const totSalesBase = Number(exemptSalesBs || 0) + Number(exportSalesBs || 0) + Number(baseGeneral16Bs || 0) + Number(baseAdditionalBs || 0) + Number(baseReduced8Bs || 0);
  const totDebitos = Number(taxGeneral16Bs || 0) + Number(taxAdditionalBs || 0) + Number(taxReduced8Bs || 0) + Number(adjustmentsDebitsBs || 0) - Number(exoneratedDebitsBs || 0);

  // Item 1: Ventas Internas no Gravadas
  lines.push(`,1,Ventas Internas no Gravadas,${fmt(exemptSalesBs)},`);

  // Item 2: Ventas de Exportación
  lines.push(`,2,Ventas de Exportación,${exportSalesBs ? fmt(exportSalesBs) : ''},`);

  // Item 3: Ventas Internas Gravadas por Alícuota General
  lines.push(`,3,Ventas Internas Gravadas por Alícuota General,${fmt(baseGeneral16Bs)},${fmt(taxGeneral16Bs)}`);

  // Item 4: Ventas Internas Gravadas Alic General mas adicional
  lines.push(`,4,Ventas Internas Gravadas Alic General mas adicional,${baseAdditionalBs ? fmt(baseAdditionalBs) : ''},${taxAdditionalBs ? fmt(taxAdditionalBs) : ''}`);

  // Item 5: Ventas Internas Gravadas por alic reducida
  lines.push(`,5,Ventas Internas Gravadas por alic reducida,${baseReduced8Bs ? fmt(baseReduced8Bs) : ''},${taxReduced8Bs ? fmt(taxReduced8Bs) : ''}`);

  // Item 6: Total Vtas y Debitos Fiscales para efectos det
  lines.push(`,6,Total Vtas y Debitos Fiscales para efectos det,${fmt(totSalesBase)},${fmt(totDebitos)}`);

  // Item 7: Ajustes a los Débitos Fiscales de períodos anteriores
  lines.push(`,7,Ajustes a los Débitos Fiscales de períodos anteriores,${adjustmentsDebitsBs ? fmt(adjustmentsDebitsBs) : ''},`);

  // Item 8: Certificados de Débitos Fiscales Exonerados
  lines.push(`,8,Certificados de Débitos Fiscales Exonerados,${exoneratedDebitsBs ? fmt(exoneratedDebitsBs) : ''},`);

  // Item 9: Total Débitos Fiscales
  lines.push(`,9,Total Débitos Fiscales,,${fmt(totDebitos)}`);

  // Fila 21: ,,,,
  lines.push(',,,,');

  // Fila 22: CREDITOS FISCALES
  lines.push(',N°,CREDITOS FISCALES,BASE IMPONIBLE,CREDITO FISCAL');

  const totPurchasesBase = Number(exemptPurchasesBs || 0) + Number(baseImportsGeneralBs || 0) + Number(baseImportsAddBs || 0) + Number(baseImportsRedBs || 0) + Number(basePurchasesGeneralBs || 0) + Number(basePurchasesAddBs || 0) + Number(basePurchasesRedBs || 0);
  const totCreditos = Number(taxImportsGeneralBs || 0) + Number(taxImportsAddBs || 0) + Number(taxImportsRedBs || 0) + Number(taxPurchasesGeneralBs || 0) + Number(taxPurchasesAddBs || 0) + Number(taxPurchasesRedBs || 0) + Number(adjustmentsCreditsBs || 0);

  // Item 10: Compras no gravadas y/o sin derecho a Credito Fiscal
  lines.push(`,10,Compras no gravadas y/o sin derecho a Credito Fiscal,${fmt(exemptPurchasesBs || 0)},`);

  // Item 11: Importación Gravadas por Alícuota General
  lines.push(`,11,Importación Gravadas por Alícuota General,${baseImportsGeneralBs ? fmt(baseImportsGeneralBs) : ''},${taxImportsGeneralBs ? fmt(taxImportsGeneralBs) : ''}`);

  // Item 12: Importaciones Gravadas por Alícuota General más Alícuota Adicional
  lines.push(`,12,"Importaciones Gravadas por Alícuota General más\nAlícuota Adicional",${baseImportsAddBs ? fmt(baseImportsAddBs) : ''},${taxImportsAddBs ? fmt(taxImportsAddBs) : ''}`);

  // Item 13: Importaciones Gravadas por Alícuota Reducida
  lines.push(`,13,Importaciones Gravadas por Alícuota Reducida,${baseImportsRedBs ? fmt(baseImportsRedBs) : ''},${taxImportsRedBs ? fmt(taxImportsRedBs) : ''}`);

  // Item 14: Compras Internas Gravadas por Alícuota General
  lines.push(`,14,Compras Internas Gravadas por Alícuota General,${fmt(basePurchasesGeneralBs || 0)},${fmt(taxPurchasesGeneralBs || 0)}`);

  // Item 15: Compras Int Gravadas por Alícuota General más Alícuota Adicional
  lines.push(`,15,Compras Int Gravadas por Alícuota General más Alícuota Adicional,${basePurchasesAddBs ? fmt(basePurchasesAddBs) : ''},${taxPurchasesAddBs ? fmt(taxPurchasesAddBs) : ''}`);

  // Item 16: Compras Internas Gravadas por Alícuota Reducida
  lines.push(`,16,Compras Internas Gravadas por Alícuota Reducida,${basePurchasesRedBs ? fmt(basePurchasesRedBs) : ''},${taxPurchasesRedBs ? fmt(taxPurchasesRedBs) : ''}`);

  // Item 17: Total Compras y Créditos Fiscales del Período
  lines.push(`,17,Total Compras y Créditos Fiscales del Período,${fmt(totPurchasesBase)},${fmt(totCreditos)}`);

  // Item 18: Créditos Fiscales Totalmente Deducibles
  lines.push(`,18,Créditos Fiscales Totalmente Deducibles,${deductibleCreditsBs ? fmt(deductibleCreditsBs) : ''},`);

  // Item 19: Créditos Fiscales producto de la Aplicación del % de la prorrata
  lines.push(`,19,Créditos Fiscales producto de la Aplicación del % de la prorrata,${prorataCreditsBs ? fmt(prorataCreditsBs) : ''},`);

  // Item 20: Total Créditos Fiscales deducibles
  lines.push(`,20,Total Créditos Fiscales deducibles,${totalDeductibleCreditsBs ? fmt(totalDeductibleCreditsBs) : ''},`);

  // Item 21: Excedente Créditos Fiscales del mes Anterior
  lines.push(`,21,Excedente Créditos Fiscales del mes Anterior,${previousMonthExcessCreditBs ? fmt(previousMonthExcessCreditBs) : ''},`);

  // Item 22: Reintegro Solicitado (sólo Exportadores)
  lines.push(`,22,Reintegro Solicitado (sólo Exportadores),${exportRefundRequestedBs ? fmt(exportRefundRequestedBs) : ''},`);

  // Item 23: Reintegro Solicitado (sólo a entes exonerados)
  lines.push(`,23,Reintegro Solicitado (sólo a entes exonerados),${exoneratedRefundRequestedBs ? fmt(exoneratedRefundRequestedBs) : ''},`);

  // Item 24: Ajustes a los Créditos Fiscales de períodos anteriores
  lines.push(`,24,Ajustes a los Créditos Fiscales de períodos anteriores,${adjustmentsCreditsBs ? fmt(adjustmentsCreditsBs) : ''},`);

  // Item 25: Cert de Débitos Fiscales Exonerados. Registrado en el período
  lines.push(`,25,Cert de Débitos Fiscales Exonerados. Registrado en el período,${exoneratedDebitsCertBs ? fmt(exoneratedDebitsCertBs) : ''},`);

  // Item 26: Total Créditos Fiscales
  lines.push(`,26,Total Créditos Fiscales,,${fmt(totCreditos)}`);

  // Fila 41: ,,,,
  lines.push(',,,,');

  // Fila 42: AUTOLIQUIDACION
  lines.push(',N°,AUTOLIQUIDACION,,');

  const diff = totDebitos - totCreditos;
  const isCuotaPagar = diff > 0;
  const cuotaTributaria = isCuotaPagar ? diff : 0;
  const excedente = !isCuotaPagar ? Math.abs(diff) : 0;
  const subtotalPagar = cuotaTributaria;

  const totRetenciones = Number(retencionesAcumuladas || 0) + Number(retencionesPeriodo || 0);
  const retDescontadas = Math.min(subtotalPagar, Number(retencionesDescontadas !== undefined ? retencionesDescontadas : totRetenciones));
  const saldoRet = Math.max(0, totRetenciones - retDescontadas);
  const totalPagar = Math.max(0, subtotalPagar - retDescontadas);

  // Item 27: Total Cuota Tributaria del Período
  lines.push(`,27,Total Cuota Tributaria del Período,,${fmt(cuotaTributaria)}`);

  // Item 28: Excedente de Crédito Fiscal para el mes siguiente
  lines.push(`,28,Excedente de Crédito Fiscal para el mes siguiente,,${fmt(excedente)}`);

  // Item 29: Sub-total Impuesto a Pagar
  lines.push(`,29,Sub-total Impuesto a Pagar,,${fmt(subtotalPagar)}`);

  // Item 30: Retenciones Acumuladas por Descontar
  lines.push(`,30,Retenciones Acumuladas por Descontar,${fmt(retencionesAcumuladas || 0)},`);

  // Item 31: Retenciones del Período
  lines.push(`,31,Retenciones del Período,${fmt(retencionesPeriodo || 0)},`);

  // Item 32: Total Retenciones
  lines.push(`,32,Total Retenciones,${fmt(totRetenciones || 0)},`);

  // Item 33: Retenciones Soportadas y Descontadas en esta Declaración
  lines.push(`,33,Retenciones Soportadas y Descontadas en esta Declaración,,${fmt(retDescontadas || 0)}`);

  // Item 34: Saldo de Retenciones de IVA no aplicado
  lines.push(`,34,Saldo de Retenciones de IVA no aplicado,,${fmt(saldoRet || 0)}`);

  // Item 35: Sub-total Impuesto a Pagar
  lines.push(',35,Sub-total Impuesto a Pagar,,');

  // Item 36: Total a Pagar
  lines.push(`,36,Total a Pagar,,${fmt(totalPagar)}`);

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return filename;
}
