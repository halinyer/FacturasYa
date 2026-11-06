import { CLIENT_CONFIG } from '../config/clientConfig';

export const formatVE = (num, decimals = 2) => {
  const val = Number(num) || 0;
  return val.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export function exportSeniatBookToCSV({
  isSales,
  selectedMonth,
  selectedYear,
  selectedFortnight,
  salesBookData = [],
  salesTotals = {},
  purchasesBookData = [],
  purchasesTotals = {}
}) {
  const periodLabel = `${selectedMonth}-${selectedYear}_${selectedFortnight}`;
  const filename = `Libro_de_${isSales ? 'Ventas' : 'Compras'}_SENIAT_${CLIENT_CONFIG.rif || 'J500195923'}_${periodLabel}.csv`;

  const lines = [];

  lines.push(`"${CLIENT_CONFIG.legalName || 'INVERSIONES HAPPY DAYS 1 C.A'}"`);
  lines.push(`"RIF: ${CLIENT_CONFIG.rif || 'J-500195923'}"`);
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
        `"${row.clientName.replace(/"/g, '""')}"`,
        `"${row.clientType}"`,
        `"${row.invoiceNumber}"`,
        `"${row.controlNumber}"`,
        `"${row.transactionType}"`,
        `"${row.affectedInvoice}"`,
        `"${formatVE(row.totalBs)}"`,
        `"${formatVE(row.exemptBs)}"`,
        `"${formatVE(row.baseBs)}"`,
        '"16%"',
        `"${formatVE(row.ivaBs)}"`,
        `"${formatVE(row.igtfBs)}"`,
        `"${formatVE(row.ivaRetainedBs)}"`,
        `"${row.totalUSD.toFixed(2)}"`
      ];
      lines.push(line.join(';'));
    });

    lines.push('');
    const totLine = [
      '"TOTALES GENERALES"',
      '""', '""', '""', '""', '""', '""', '""', '""',
      `"${formatVE(salesTotals.totalBs)}"`,
      `"${formatVE(salesTotals.exemptBs)}"`,
      `"${formatVE(salesTotals.baseBs)}"`,
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
        `"${row.supplierName.replace(/"/g, '""')}"`,
        `"${row.invoiceNumber}"`,
        `"${row.controlNumber}"`,
        `"${row.transactionType}"`,
        `"${row.affectedInvoice}"`,
        `"${formatVE(row.totalBs)}"`,
        `"${formatVE(row.exemptBs)}"`,
        `"${formatVE(row.baseBs)}" `,
        '"16%"',
        `"${formatVE(row.ivaBs)}"`,
        `"${formatVE(row.ivaRetainedBs)}"`,
        `"${row.retentionNumber}"`,
        `"${formatVE(row.igtfBs)}"`,
        `"${row.totalUSD.toFixed(2)}"`,
        `"${row.category}"`
      ];
      lines.push(line.join(';'));
    });

    lines.push('');
    const totLine = [
      '"TOTALES GENERALES"',
      '""', '""', '""', '""', '""', '""', '""',
      `"${formatVE(purchasesTotals.totalBs)}"`,
      `"${formatVE(purchasesTotals.exemptBs)}"`,
      `"${formatVE(purchasesTotals.baseBs)}"`,
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
  zRecords = [],
  machineNumber = '',
  rif = CLIENT_CONFIG.rif || 'J-500195923',
  legalName = CLIENT_CONFIG.legalName || 'INVERSIONES HAPPY DAYS 1 C.A'
}) {
  const cleanRif = (rif || '').replace(/[^A-Za-z0-9]/g, '');
  const filename = `Libro_de_Ventas_Reportes_Z_SENIAT_${cleanRif}_${selectedMonth}-${selectedYear}.csv`;
  const lines = [];

  lines.push(`"${legalName}"`);
  lines.push(`"RIF: ${rif}"`);
  lines.push(`"LIBRO DE VENTAS (IVA) - CONSOLIDADO DIARIO POR REPORTES Z DE MAQUINA FISCAL"`);
  lines.push(`"Base Legal: Providencia Administrativa SENIAT SNAT/2011/00071 (Articulos 77 y 78)"`);
  lines.push(`"Periodo Fiscal: Mes ${selectedMonth}/${selectedYear}"`);
  lines.push(`"Serial Maquina Fiscal: ${machineNumber || 'N/A'}"`);
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

  zRecords.forEach(z => {
    const s = Number(z.totalSalesBs || 0);
    const ex = Number(z.exemptSalesBs || 0);
    const b16 = Number(z.baseGeneral16Bs || 0);
    const t16 = Number(z.taxGeneral16Bs || 0);
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
      `"${z.zDate || ''}"`,
      `"Z-${String(z.zNumber || '').padStart(4, '0')}"`,
      `"${z.registeredMachineNumber || machineNumber || ''}"`,
      `"${z.firstInvoiceNumber ? String(z.firstInvoiceNumber).padStart(8, '0') : 'N/D'}"`,
      `"${String(z.lastInvoiceNumber || 0).padStart(8, '0')}"`,
      `"${z.invoiceCount !== undefined ? z.invoiceCount : ''}"`,
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
