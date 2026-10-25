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
  const filename = `Libro_de_${isSales ? 'Ventas' : 'Compras'}_SENIAT_${CLIENT_CONFIG.rif || 'J3105558882'}_${periodLabel}.csv`;

  const lines = [];

  lines.push(`"${CLIENT_CONFIG.legalName || 'DISTRIBUIDORA Y FRANQUICIA HELADOS CALI C.A.'}"`);
  lines.push(`"RIF: ${CLIENT_CONFIG.rif || 'J-310555888-2'}"`);
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
