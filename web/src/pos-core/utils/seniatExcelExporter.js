import ExcelJS from 'exceljs';
import { getFiscalCompanyProfile } from './seniatCsvExporter';

/**
 * EXPORTADOR OFICIAL DE LIBROS DE COMPRA Y VENTA SENIAT EN MICROSOFT EXCEL (.XLSX)
 * Genera un libro estructurado de 3 hojas interconectadas:
 *  - Hoja 1: COMPRAS (Libro de Compras SENIAT con detalle de proveedores y créditos fiscales)
 *  - Hoja 2: VENTAS (Libro de Ventas SENIAT consolidado por Reporte Z o detallado)
 *  - Hoja 3: RESUMEN (Plantilla Oficial Forma 30 con Débitos, Créditos y Autoliquidación con fórmulas)
 */

export async function exportFullSeniatWorkbook({
  selectedMonth = '11',
  selectedYear = '2026',
  selectedFortnight = 'all',
  customDateRange,
  companyProfile: customCompanyProfile = {},
  salesBookData = [],
  salesTotals = {},
  purchasesBookData = [],
  purchasesTotals = {},
  zReports = [],
  zReportsTotals = {},
  isUsingZ = false
}) {
  const company = getFiscalCompanyProfile(customCompanyProfile);
  const m = String(selectedMonth).padStart(2, '0');
  const y = String(selectedYear || new Date().getFullYear());

  const monthNames = {
    '01': 'ENE', '02': 'FEB', '03': 'MAR', '04': 'ABR',
    '05': 'MAY', '06': 'JUN', '07': 'JUL', '08': 'AGO',
    '09': 'SEP', '10': 'OCT', '11': 'NOV', '12': 'DIC'
  };
  const mCode = monthNames[m] || m;

  let startDay = '01';
  let endDay = String(new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate()).padStart(2, '0');
  let fortnightLabel = 'Mes Completo';

  if (selectedFortnight === 'q1') {
    startDay = '01';
    endDay = '15';
    fortnightLabel = '1ra Quincena';
  } else if (selectedFortnight === 'q2') {
    startDay = '16';
    fortnightLabel = '2da Quincena';
  }

  const dateRangeStr = customDateRange || `Del ${startDay}-${m}-${y} Al ${endDay}-${m}-${y}`;
  const filename = `COMPRA VENTAS ${mCode} - ${company.legalName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;

  // Crear Workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FacturasYa - Sistema de Facturación y POS SENIAT';
  workbook.lastModifiedBy = company.legalName;
  workbook.created = new Date();
  workbook.modified = new Date();

  // Estilos reutilizables
  const fontFamily = 'Segoe UI';
  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Slate 900
  };
  const subHeaderFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' } // Slate 100
  };
  const totalFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFEF3C7' } // Amber 100
  };
  const zebraFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' } // Slate 50
  };

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };

  const totalBorder = {
    top: { style: 'thin', color: { argb: 'FF0F172A' } },
    bottom: { style: 'double', color: { argb: 'FF0F172A' } }
  };

  const numFormat = '#,##0.00';

  // =========================================================================
  // HOJA 1: COMPRAS
  // =========================================================================
  const wsCompras = workbook.addWorksheet('COMPRAS', {
    views: [{ showGridLines: true }]
  });

  // Título e Identificación Fiscal
  wsCompras.getCell('A1').value = company.legalName;
  wsCompras.getCell('A1').font = { name: fontFamily, size: 14, bold: true, color: { argb: 'FF0F172A' } };

  wsCompras.getCell('A2').value = `RIF: ${company.rif} | DIRECCIÓN: ${company.fiscalAddress}`;
  wsCompras.getCell('A2').font = { name: fontFamily, size: 9, color: { argb: 'FF64748B' } };

  wsCompras.getCell('A3').value = `LIBRO DE COMPRAS (IVA) - PERÍODO FISCAL: ${m}/${y} (${fortnightLabel}) - ${dateRangeStr}`;
  wsCompras.getCell('A3').font = { name: fontFamily, size: 10, bold: true, color: { argb: 'FF1E293B' } };

  wsCompras.getCell('A4').value = 'Moneda de Registro: Bolívares (Bs.) | Base Legal: Providencia Administrativa SENIAT SNAT/2011/00071';
  wsCompras.getCell('A4').font = { name: fontFamily, size: 8, italic: true, color: { argb: 'FF94A3B8' } };

  // Encabezados de tabla de compras (Fila 6)
  const comprasHeaders = [
    'N° Op.',
    'Fecha',
    'RIF Proveedor',
    'Razón Social Proveedor',
    'N° Factura',
    'N° Control',
    'Tipo Trans.',
    'Doc. Afectado',
    'Total Compras (Bs.)',
    'Compras Exentas (Bs.)',
    'Base Imponible 16% (Bs.)',
    '% Alíc.',
    'Crédito Fiscal 16% (Bs.)',
    'IVA Retenido (Bs.)',
    'N° Comp. Ret.',
    'IGTF Pagado (Bs.)',
    'Ref. USD ($)'
  ];

  const comprasHeaderRow = wsCompras.getRow(6);
  comprasHeaderRow.values = comprasHeaders;
  comprasHeaderRow.height = 24;
  comprasHeaderRow.eachCell((cell) => {
    cell.font = { name: fontFamily, size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = headerFill;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  let comprasCurrentRow = 7;
  const purchasesList = purchasesBookData && purchasesBookData.length > 0 ? purchasesBookData : [];

  if (purchasesList.length === 0) {
    // Si no hay compras aún registradas, colocar una fila vacía para que las fórmulas tengan una referencia válida
    const emptyRow = wsCompras.getRow(comprasCurrentRow);
    emptyRow.values = [1, `${startDay}/${m}/${y}`, 'J-00000000-0', 'Sin compras registradas en este período', '00000000', '00-000000', '01-REG', '', 0, 0, 0, '16%', 0, 0, '', 0, 0];
    emptyRow.font = { name: fontFamily, size: 9 };
    for (let c = 1; c <= comprasHeaders.length; c++) {
      emptyRow.getCell(c).border = thinBorder;
      if ([9, 10, 11, 13, 14, 16, 17].includes(c)) {
        emptyRow.getCell(c).numFmt = numFormat;
        emptyRow.getCell(c).alignment = { horizontal: 'right' };
      }
    }
    comprasCurrentRow++;
  } else {
    purchasesList.forEach((p, idx) => {
      const row = wsCompras.getRow(comprasCurrentRow);
      const total = Number(p.totalAmountBs || p.totalBs || 0);
      const ex = Number(p.exemptAmountBs || p.exemptBs || 0);
      const base = Number(p.taxableBaseBs || p.baseBs || (total > 0 ? (total - ex) / 1.16 : 0));
      const iva = Number(p.ivaBs || (base * 0.16));
      const ret = Number(p.ivaRetainedBs || 0);
      const igtf = Number(p.igtfBs || 0);
      const usd = Number(p.totalUSD || p.totalUsd || 0);

      row.values = [
        idx + 1,
        p.dateFormatted || p.date || p.purchaseDate || '',
        p.supplierRif || p.rif || 'J-00000000-0',
        p.supplierName || p.name || 'Proveedor',
        p.invoiceNumber || '',
        p.controlNumber || '',
        p.transactionType || '01-REG',
        p.affectedInvoice || '',
        total,
        ex,
        base,
        '16%',
        iva,
        ret,
        p.retentionNumber || '',
        igtf,
        usd
      ];

      row.font = { name: fontFamily, size: 9 };
      if (idx % 2 === 1) {
        row.eachCell({ includeEmpty: true }, (c) => {
          c.fill = zebraFill;
        });
      }

      for (let c = 1; c <= comprasHeaders.length; c++) {
        row.getCell(c).border = thinBorder;
        if ([9, 10, 11, 13, 14, 16, 17].includes(c)) {
          row.getCell(c).numFmt = numFormat;
          row.getCell(c).alignment = { horizontal: 'right' };
        } else if ([1, 2, 3, 5, 6, 7, 12, 15].includes(c)) {
          row.getCell(c).alignment = { horizontal: 'center' };
        }
      }

      comprasCurrentRow++;
    });
  }

  // Fila de Totales de Compras
  const comprasTotalRowIdx = comprasCurrentRow;
  const comprasTotRow = wsCompras.getRow(comprasTotalRowIdx);
  const lastComprasDataRow = comprasCurrentRow - 1;

  comprasTotRow.getCell(1).value = 'TOTALES COMPRAS (Bs.)';
  comprasTotRow.getCell(9).value = { formula: `SUM(I7:I${lastComprasDataRow})`, result: purchasesTotals.totalAmountBs || purchasesTotals.totalBs || 0 };
  comprasTotRow.getCell(10).value = { formula: `SUM(J7:J${lastComprasDataRow})`, result: purchasesTotals.exemptAmountBs || purchasesTotals.exemptBs || 0 };
  comprasTotRow.getCell(11).value = { formula: `SUM(K7:K${lastComprasDataRow})`, result: purchasesTotals.taxableBaseBs || purchasesTotals.baseBs || 0 };
  comprasTotRow.getCell(13).value = { formula: `SUM(M7:M${lastComprasDataRow})`, result: purchasesTotals.ivaBs || 0 };
  comprasTotRow.getCell(14).value = { formula: `SUM(N7:N${lastComprasDataRow})`, result: purchasesTotals.ivaRetainedBs || 0 };
  comprasTotRow.getCell(16).value = { formula: `SUM(P7:P${lastComprasDataRow})`, result: 0 };
  comprasTotRow.getCell(17).value = { formula: `SUM(Q7:Q${lastComprasDataRow})`, result: purchasesTotals.totalUSD || 0 };

  comprasTotRow.font = { name: fontFamily, size: 10, bold: true, color: { argb: 'FF0F172A' } };
  comprasTotRow.height = 22;
  for (let c = 1; c <= comprasHeaders.length; c++) {
    const cell = comprasTotRow.getCell(c);
    cell.fill = totalFill;
    cell.border = totalBorder;
    if ([9, 10, 11, 13, 14, 16, 17].includes(c)) {
      cell.numFmt = numFormat;
      cell.alignment = { horizontal: 'right' };
    }
  }

  // Anchos automáticos columnas compras
  wsCompras.columns = [
    { width: 8 },  // Op
    { width: 12 }, // Fecha
    { width: 16 }, // RIF
    { width: 34 }, // Proveedor
    { width: 14 }, // Factura
    { width: 14 }, // Control
    { width: 11 }, // Trans
    { width: 14 }, // Afectado
    { width: 19 }, // Total
    { width: 19 }, // Exento
    { width: 20 }, // Base 16
    { width: 8 },  // Alic
    { width: 20 }, // Credito 16
    { width: 16 }, // Retenido
    { width: 15 }, // Comp Ret
    { width: 15 }, // IGTF
    { width: 14 }  // USD
  ];


  // =========================================================================
  // HOJA 2: VENTAS
  // =========================================================================
  const wsVentas = workbook.addWorksheet('VENTAS', {
    views: [{ showGridLines: true }]
  });

  wsVentas.getCell('A1').value = company.legalName;
  wsVentas.getCell('A1').font = { name: fontFamily, size: 14, bold: true, color: { argb: 'FF0F172A' } };

  wsVentas.getCell('A2').value = `RIF: ${company.rif} | DIRECCIÓN: ${company.fiscalAddress}`;
  wsVentas.getCell('A2').font = { name: fontFamily, size: 9, color: { argb: 'FF64748B' } };

  wsVentas.getCell('A3').value = `LIBRO DE VENTAS (IVA) - PERÍODO FISCAL: ${m}/${y} (${fortnightLabel}) - ${dateRangeStr}`;
  wsVentas.getCell('A3').font = { name: fontFamily, size: 10, bold: true, color: { argb: 'FF1E293B' } };

  wsVentas.getCell('A4').value = `Serial Máquina Fiscal: ${company.machineNumber || 'N/A'} | Base Legal: Providencia SNAT/2011/00071 (Art. 77 y 78)`;
  wsVentas.getCell('A4').font = { name: fontFamily, size: 8, italic: true, color: { argb: 'FF94A3B8' } };

  const ventasHeaders = isUsingZ || (zReports && zReports.length > 0)
    ? [
        'N° Op.',
        'Fecha Z',
        'N° Reporte Z',
        'Serial Fiscal',
        'Desde Factura',
        'Hasta Factura',
        'Cant. Docs',
        'Total Ventas (Bs.)',
        'Ventas Exentas (Bs.)',
        'Base Imponible 16% (Bs.)',
        '% Alíc.',
        'Débito Fiscal 16% (Bs.)',
        'Base Reducida 8% (Bs.)',
        'IVA Reducido 8% (Bs.)',
        'Devoluciones (Bs.)',
        'Ventas Netas (Bs.)'
      ]
    : [
        'N° Op.',
        'Fecha',
        'RIF / C.I. Cliente',
        'Nombre o Razón Social',
        'N° Factura',
        'N° Control',
        'Tipo Trans.',
        'Total Ventas (Bs.)',
        'Ventas Exentas (Bs.)',
        'Base Imponible 16% (Bs.)',
        '% Alíc.',
        'Débito Fiscal 16% (Bs.)',
        'IGTF 3% (Bs.)',
        'IVA Retenido (Bs.)',
        'Ref. USD ($)'
      ];

  const ventasHeaderRow = wsVentas.getRow(6);
  ventasHeaderRow.values = ventasHeaders;
  ventasHeaderRow.height = 24;
  ventasHeaderRow.eachCell((cell) => {
    cell.font = { name: fontFamily, size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = headerFill;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  let ventasCurrentRow = 7;
  const isZMode = isUsingZ || (zReports && zReports.length > 0);

  if (isZMode) {
    const records = zReports && zReports.length > 0 ? zReports : [];
    if (records.length === 0) {
      const emptyRow = wsVentas.getRow(ventasCurrentRow);
      emptyRow.values = [1, `${startDay}/${m}/${y}`, 'Z-0001', company.machineNumber || 'Z4A0000000', '00000001', '00000001', 0, 0, 0, 0, '16%', 0, 0, 0, 0, 0];
      emptyRow.font = { name: fontFamily, size: 9 };
      for (let c = 1; c <= ventasHeaders.length; c++) {
        emptyRow.getCell(c).border = thinBorder;
        if ([8, 9, 10, 12, 13, 14, 15, 16].includes(c)) {
          emptyRow.getCell(c).numFmt = numFormat;
          emptyRow.getCell(c).alignment = { horizontal: 'right' };
        }
      }
      ventasCurrentRow++;
    } else {
      records.forEach((z, idx) => {
        const row = wsVentas.getRow(ventasCurrentRow);
        const s = Number(z.totalSalesBs || z.totalBs || z.total || 0);
        const ex = Number(z.exemptSalesBs || z.exemptBs || 0);
        const b16 = Number(z.baseGeneral16Bs || z.taxableBaseBs || z.baseBs || (s > 0 ? (s - ex) / 1.16 : 0));
        const t16 = Number(z.taxGeneral16Bs || z.ivaBs || (b16 * 0.16));
        const b8 = Number(z.baseReduced8Bs || 0);
        const t8 = Number(z.taxReduced8Bs || 0);
        const dev = Number(z.devolutionsBs || 0);
        const net = s - dev;

        row.values = [
          idx + 1,
          z.zDate || z.date || '',
          `Z-${String(z.zNumber || idx + 1).padStart(4, '0')}`,
          z.registeredMachineNumber || company.machineNumber || '',
          z.firstInvoiceNumber ? String(z.firstInvoiceNumber).padStart(8, '0') : '00000001',
          String(z.lastInvoiceNumber || z.firstInvoiceNumber || 1).padStart(8, '0'),
          z.invoiceCount !== undefined ? z.invoiceCount : 1,
          s,
          ex,
          b16,
          '16%',
          t16,
          b8,
          t8,
          dev,
          net
        ];

        row.font = { name: fontFamily, size: 9 };
        if (idx % 2 === 1) {
          row.eachCell({ includeEmpty: true }, (c) => {
            c.fill = zebraFill;
          });
        }

        for (let c = 1; c <= ventasHeaders.length; c++) {
          row.getCell(c).border = thinBorder;
          if ([8, 9, 10, 12, 13, 14, 15, 16].includes(c)) {
            row.getCell(c).numFmt = numFormat;
            row.getCell(c).alignment = { horizontal: 'right' };
          } else if ([1, 2, 3, 4, 5, 6, 7, 11].includes(c)) {
            row.getCell(c).alignment = { horizontal: 'center' };
          }
        }

        ventasCurrentRow++;
      });
    }
  } else {
    // Modo Facturas individuales
    const records = salesBookData && salesBookData.length > 0 ? salesBookData : [];
    if (records.length === 0) {
      const emptyRow = wsVentas.getRow(ventasCurrentRow);
      emptyRow.values = [1, `${startDay}/${m}/${y}`, 'V-00000000-0', 'Consumidor Final', 'FACT-0001', '00-000001', '01-REG', 0, 0, 0, '16%', 0, 0, 0, 0];
      emptyRow.font = { name: fontFamily, size: 9 };
      for (let c = 1; c <= ventasHeaders.length; c++) {
        emptyRow.getCell(c).border = thinBorder;
        if ([8, 9, 10, 12, 13, 14, 15].includes(c)) {
          emptyRow.getCell(c).numFmt = numFormat;
          emptyRow.getCell(c).alignment = { horizontal: 'right' };
        }
      }
      ventasCurrentRow++;
    } else {
      records.forEach((s, idx) => {
        const row = wsVentas.getRow(ventasCurrentRow);
        const tot = Number(s.totalBs || s.total || 0);
        const ex = Number(s.exemptBs || 0);
        const base = Number(s.taxableBaseBs || s.baseBs || (tot > 0 ? (tot - ex) / 1.16 : 0));
        const iva = Number(s.ivaBs || (base * 0.16));
        const igtf = Number(s.igtfBs || 0);
        const ret = Number(s.ivaRetainedBs || 0);
        const usd = Number(s.totalUSD || s.totalUsd || 0);

        row.values = [
          idx + 1,
          s.dateFormatted || s.date || '',
          s.clientRif || 'V-00000000-0',
          s.clientName || 'Consumidor Final',
          s.invoiceNumber || '',
          s.controlNumber || '',
          s.transactionType || '01-REG',
          tot,
          ex,
          base,
          '16%',
          iva,
          igtf,
          ret,
          usd
        ];

        row.font = { name: fontFamily, size: 9 };
        if (idx % 2 === 1) {
          row.eachCell({ includeEmpty: true }, (c) => {
            c.fill = zebraFill;
          });
        }

        for (let c = 1; c <= ventasHeaders.length; c++) {
          row.getCell(c).border = thinBorder;
          if ([8, 9, 10, 12, 13, 14, 15].includes(c)) {
            row.getCell(c).numFmt = numFormat;
            row.getCell(c).alignment = { horizontal: 'right' };
          } else if ([1, 2, 3, 5, 6, 7, 11].includes(c)) {
            row.getCell(c).alignment = { horizontal: 'center' };
          }
        }

        ventasCurrentRow++;
      });
    }
  }

  // Fila de Totales de Ventas
  const ventasTotalRowIdx = ventasCurrentRow;
  const ventasTotRow = wsVentas.getRow(ventasTotalRowIdx);
  const lastVentasDataRow = ventasCurrentRow - 1;

  ventasTotRow.getCell(1).value = 'TOTALES VENTAS (Bs.)';

  if (isZMode) {
    ventasTotRow.getCell(8).value = { formula: `SUM(H7:H${lastVentasDataRow})`, result: zReportsTotals.totalSalesBs || 0 };
    ventasTotRow.getCell(9).value = { formula: `SUM(I7:I${lastVentasDataRow})`, result: zReportsTotals.exemptSalesBs || 0 };
    ventasTotRow.getCell(10).value = { formula: `SUM(J7:J${lastVentasDataRow})`, result: zReportsTotals.baseGeneral16Bs || 0 };
    ventasTotRow.getCell(12).value = { formula: `SUM(L7:L${lastVentasDataRow})`, result: zReportsTotals.taxGeneral16Bs || 0 };
    ventasTotRow.getCell(13).value = { formula: `SUM(M7:M${lastVentasDataRow})`, result: zReportsTotals.baseReduced8Bs || 0 };
    ventasTotRow.getCell(14).value = { formula: `SUM(N7:N${lastVentasDataRow})`, result: zReportsTotals.taxReduced8Bs || 0 };
    ventasTotRow.getCell(15).value = { formula: `SUM(O7:O${lastVentasDataRow})`, result: 0 };
    ventasTotRow.getCell(16).value = { formula: `H${ventasTotalRowIdx}-O${ventasTotalRowIdx}`, result: zReportsTotals.totalSalesBs || 0 };
  } else {
    ventasTotRow.getCell(8).value = { formula: `SUM(H7:H${lastVentasDataRow})`, result: salesTotals.totalBs || 0 };
    ventasTotRow.getCell(9).value = { formula: `SUM(I7:I${lastVentasDataRow})`, result: salesTotals.exemptBs || 0 };
    ventasTotRow.getCell(10).value = { formula: `SUM(J7:J${lastVentasDataRow})`, result: salesTotals.taxableBaseBs || 0 };
    ventasTotRow.getCell(12).value = { formula: `SUM(L7:L${lastVentasDataRow})`, result: salesTotals.ivaBs || 0 };
    ventasTotRow.getCell(13).value = { formula: `SUM(M7:M${lastVentasDataRow})`, result: salesTotals.igtfBs || 0 };
    ventasTotRow.getCell(14).value = { formula: `SUM(N7:N${lastVentasDataRow})`, result: 0 };
    ventasTotRow.getCell(15).value = { formula: `SUM(O7:O${lastVentasDataRow})`, result: salesTotals.totalUSD || 0 };
  }

  ventasTotRow.font = { name: fontFamily, size: 10, bold: true, color: { argb: 'FF0F172A' } };
  ventasTotRow.height = 22;
  for (let c = 1; c <= ventasHeaders.length; c++) {
    const cell = ventasTotRow.getCell(c);
    cell.fill = totalFill;
    cell.border = totalBorder;
    if (c >= 8) {
      cell.numFmt = numFormat;
      cell.alignment = { horizontal: 'right' };
    }
  }

  wsVentas.columns = isZMode
    ? [
        { width: 8 },  // Op
        { width: 13 }, // Fecha
        { width: 14 }, // Reporte Z
        { width: 16 }, // Serial
        { width: 15 }, // Desde
        { width: 15 }, // Hasta
        { width: 11 }, // Cant
        { width: 19 }, // Total
        { width: 19 }, // Exento
        { width: 20 }, // Base 16
        { width: 8 },  // Alic
        { width: 20 }, // Debito 16
        { width: 16 }, // Base 8
        { width: 16 }, // IVA 8
        { width: 15 }, // Devs
        { width: 20 }  // Netas
      ]
    : [
        { width: 8 },  // Op
        { width: 13 }, // Fecha
        { width: 16 }, // RIF
        { width: 32 }, // Cliente
        { width: 14 }, // Factura
        { width: 14 }, // Control
        { width: 11 }, // Trans
        { width: 19 }, // Total
        { width: 19 }, // Exento
        { width: 20 }, // Base 16
        { width: 8 },  // Alic
        { width: 20 }, // Debito 16
        { width: 16 }, // IGTF
        { width: 16 }, // Retenido
        { width: 14 }  // USD
      ];


  // =========================================================================
  // HOJA 3: RESUMEN (Plantilla Exacta SENIAT Forma 30)
  // =========================================================================
  const wsResumen = workbook.addWorksheet('RESUMEN', {
    views: [{ showGridLines: true }]
  });

  // Filas 1 a 10: Encabezados del Contribuyente
  wsResumen.getCell('C2').value = 'RAZON SOCIAL DEL CONTRIBUYENTE';
  wsResumen.getCell('C2').font = { name: fontFamily, size: 9, bold: true, color: { argb: 'FF64748B' } };
  wsResumen.getCell('D2').value = 'Nº DE RIF';
  wsResumen.getCell('D2').font = { name: fontFamily, size: 9, bold: true, color: { argb: 'FF64748B' } };

  wsResumen.getCell('C3').value = company.legalName;
  wsResumen.getCell('C3').font = { name: fontFamily, size: 11, bold: true, color: { argb: 'FF0F172A' } };
  wsResumen.getCell('D3').value = company.rif;
  wsResumen.getCell('D3').font = { name: fontFamily, size: 11, bold: true, color: { argb: 'FF0F172A' } };

  wsResumen.getCell('C5').value = 'DIRECCION FISCAL';
  wsResumen.getCell('C5').font = { name: fontFamily, size: 9, bold: true, color: { argb: 'FF64748B' } };
  wsResumen.getCell('D5').value = 'TIPO DE CONTRIBUYENTE';
  wsResumen.getCell('D5').font = { name: fontFamily, size: 9, bold: true, color: { argb: 'FF64748B' } };

  wsResumen.getCell('C6').value = company.fiscalAddress;
  wsResumen.getCell('C6').font = { name: fontFamily, size: 10, color: { argb: 'FF334155' } };
  wsResumen.getCell('D6').value = company.taxpayerType || 'ORDINARIO';
  wsResumen.getCell('D6').font = { name: fontFamily, size: 10, bold: true, color: { argb: 'FF334155' } };

  wsResumen.getCell('C8').value = 'RESUMEN DE LIBRO DE COMPRA Y VENTAS';
  wsResumen.getCell('C8').font = { name: fontFamily, size: 13, bold: true, color: { argb: 'FF0F172A' } };

  wsResumen.getCell('C9').value = dateRangeStr;
  wsResumen.getCell('C9').font = { name: fontFamily, size: 10, italic: true, color: { argb: 'FF64748B' } };

  // Fila 11: Encabezados Sección Débitos Fiscales
  wsResumen.getCell('B11').value = 'N°';
  wsResumen.getCell('C11').value = 'DEBITOS FISCALES';
  wsResumen.getCell('D11').value = 'BASE IMPONIBLE';
  wsResumen.getCell('E11').value = 'DEBITO FISCAL';

  const row11 = wsResumen.getRow(11);
  row11.height = 22;
  ['B11', 'C11', 'D11', 'E11'].forEach((ref) => {
    const c = wsResumen.getCell(ref);
    c.font = { name: fontFamily, size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = headerFill;
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Referencias a celdas de VENTAS
  const ventasExentasCol = isZMode ? 'I' : 'I';
  const ventasBase16Col = isZMode ? 'J' : 'J';
  const ventasTax16Col = isZMode ? 'L' : 'L';

  const totVentasExentas = isZMode ? (zReportsTotals.exemptSalesBs || 0) : (salesTotals.exemptBs || 0);
  const totVentasBase16 = isZMode ? (zReportsTotals.baseGeneral16Bs || 0) : (salesTotals.taxableBaseBs || 0);
  const totVentasTax16 = isZMode ? (zReportsTotals.taxGeneral16Bs || 0) : (salesTotals.ivaBs || 0);

  // Renglones 1 al 9 (Débitos Fiscales)
  // Renglón 1: Ventas no gravadas
  wsResumen.getCell('B12').value = 1;
  wsResumen.getCell('C12').value = 'Ventas Internas no Gravadas';
  wsResumen.getCell('D12').value = { formula: `VENTAS!${ventasExentasCol}${ventasTotalRowIdx}`, result: totVentasExentas };
  wsResumen.getCell('D12').numFmt = numFormat;

  // Renglón 2: Exportación
  wsResumen.getCell('B13').value = 2;
  wsResumen.getCell('C13').value = 'Ventas de Exportación';
  wsResumen.getCell('D13').value = 0;
  wsResumen.getCell('D13').numFmt = numFormat;

  // Renglón 3: Gravadas Alícuota General
  wsResumen.getCell('B14').value = 3;
  wsResumen.getCell('C14').value = 'Ventas Internas Gravadas por Alícuota General';
  wsResumen.getCell('D14').value = { formula: `VENTAS!${ventasBase16Col}${ventasTotalRowIdx}`, result: totVentasBase16 };
  wsResumen.getCell('D14').numFmt = numFormat;
  wsResumen.getCell('E14').value = { formula: `VENTAS!${ventasTax16Col}${ventasTotalRowIdx}`, result: totVentasTax16 };
  wsResumen.getCell('E14').numFmt = numFormat;

  // Renglón 4: General + adicional
  wsResumen.getCell('B15').value = 4;
  wsResumen.getCell('C15').value = 'Ventas Internas Gravadas Alic General mas adicional';

  // Renglón 5: Reducida
  wsResumen.getCell('B16').value = 5;
  wsResumen.getCell('C16').value = 'Ventas Internas Gravadas por alic reducida';

  // Renglón 6: Total Vtas y Débitos Fiscales para efectos det
  wsResumen.getCell('B17').value = 6;
  wsResumen.getCell('C17').value = 'Total Vtas y Debitos Fiscales para efectos det';
  wsResumen.getCell('D17').value = { formula: 'D12+D13+D14', result: totVentasExentas + totVentasBase16 };
  wsResumen.getCell('D17').numFmt = numFormat;
  wsResumen.getCell('E17').value = { formula: 'E14', result: totVentasTax16 };
  wsResumen.getCell('E17').numFmt = numFormat;

  // Renglón 7 y 8
  wsResumen.getCell('B18').value = 7;
  wsResumen.getCell('C18').value = 'Ajustes a los Débitos Fiscales de períodos anteriores';
  wsResumen.getCell('B19').value = 8;
  wsResumen.getCell('C19').value = 'Certificados de Débitos Fiscales Exonerados';

  // Renglón 9: Total Débitos Fiscales
  wsResumen.getCell('B20').value = 9;
  wsResumen.getCell('C20').value = 'Total Débitos Fiscales';
  wsResumen.getCell('E20').value = { formula: 'E17', result: totVentasTax16 };
  wsResumen.getCell('E20').numFmt = numFormat;

  // Fila 22: Encabezados Sección Créditos Fiscales
  wsResumen.getCell('B22').value = 'N°';
  wsResumen.getCell('C22').value = 'CREDITOS FISCALES';
  wsResumen.getCell('D22').value = 'BASE IMPONIBLE';
  wsResumen.getCell('E22').value = 'CREDITO FISCAL';

  ['B22', 'C22', 'D22', 'E22'].forEach((ref) => {
    const c = wsResumen.getCell(ref);
    c.font = { name: fontFamily, size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = headerFill;
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const totComprasExentas = purchasesTotals.exemptAmountBs || purchasesTotals.exemptBs || 0;
  const totComprasBase16 = purchasesTotals.taxableBaseBs || purchasesTotals.baseBs || 0;
  const totComprasTax16 = purchasesTotals.ivaBs || 0;

  // Renglones 10 al 26 (Créditos Fiscales)
  wsResumen.getCell('B23').value = 10;
  wsResumen.getCell('C23').value = 'Compras no gravadas y/o sin derecho a Credito Fiscal';
  wsResumen.getCell('D23').value = { formula: `COMPRAS!J${comprasTotalRowIdx}`, result: totComprasExentas };
  wsResumen.getCell('D23').numFmt = numFormat;

  wsResumen.getCell('B24').value = 11;
  wsResumen.getCell('C24').value = 'Importación Gravadas por Alícuota General';

  wsResumen.getCell('B25').value = 12;
  wsResumen.getCell('C25').value = 'Importaciones Gravadas por Alícuota General más Alícuota Adicional';

  wsResumen.getCell('B27').value = 13;
  wsResumen.getCell('C27').value = 'Importaciones Gravadas por Alícuota Reducida';

  // Renglón 14: Compras Internas Gravadas 16%
  wsResumen.getCell('B28').value = 14;
  wsResumen.getCell('C28').value = 'Compras Internas Gravadas por Alícuota General';
  wsResumen.getCell('D28').value = { formula: `COMPRAS!K${comprasTotalRowIdx}`, result: totComprasBase16 };
  wsResumen.getCell('D28').numFmt = numFormat;
  wsResumen.getCell('E28').value = { formula: `COMPRAS!M${comprasTotalRowIdx}`, result: totComprasTax16 };
  wsResumen.getCell('E28').numFmt = numFormat;

  wsResumen.getCell('B29').value = 15;
  wsResumen.getCell('C29').value = 'Compras Int Gravadas por Alícuota General más Alícuota Adicional';

  wsResumen.getCell('B30').value = 16;
  wsResumen.getCell('C30').value = 'Compras Internas Gravadas por Alícuota Reducida';

  // Renglón 17: Total Compras y Créditos Fiscales del Período
  wsResumen.getCell('B31').value = 17;
  wsResumen.getCell('C31').value = 'Total Compras y Créditos Fiscales del Período';
  wsResumen.getCell('D31').value = { formula: 'D23+D28', result: totComprasExentas + totComprasBase16 };
  wsResumen.getCell('D31').numFmt = numFormat;
  wsResumen.getCell('E31').value = { formula: 'E28', result: totComprasTax16 };
  wsResumen.getCell('E31').numFmt = numFormat;

  wsResumen.getCell('B32').value = 18;
  wsResumen.getCell('C32').value = 'Créditos Fiscales Totalmente Deducibles';
  wsResumen.getCell('B33').value = 19;
  wsResumen.getCell('C33').value = 'Créditos Fiscales producto de la Aplicación del % de la prorrata';
  wsResumen.getCell('B34').value = 20;
  wsResumen.getCell('C34').value = 'Total Créditos Fiscales deducibles';
  wsResumen.getCell('B35').value = 21;
  wsResumen.getCell('C35').value = 'Excedente Créditos Fiscales del mes Anterior';
  wsResumen.getCell('B36').value = 22;
  wsResumen.getCell('C36').value = 'Reintegro Solicitado (sólo Exportadores)';
  wsResumen.getCell('B37').value = 23;
  wsResumen.getCell('C37').value = 'Reintegro Solicitado (sólo a entes exonerados)';
  wsResumen.getCell('B38').value = 24;
  wsResumen.getCell('C38').value = 'Ajustes a los Créditos Fiscales de períodos anteriores';
  wsResumen.getCell('B39').value = 25;
  wsResumen.getCell('C39').value = 'Cert de Débitos Fiscales Exonerados. Registrado en el período';

  // Renglón 26: Total Créditos Fiscales
  wsResumen.getCell('B40').value = 26;
  wsResumen.getCell('C40').value = 'Total Créditos Fiscales';
  wsResumen.getCell('E40').value = { formula: 'E31', result: totComprasTax16 };
  wsResumen.getCell('E40').numFmt = numFormat;

  // Fila 42: Encabezados Sección Autoliquidación
  wsResumen.getCell('B42').value = 'N°';
  wsResumen.getCell('C42').value = 'AUTOLIQUIDACION';
  wsResumen.getCell('E42').value = 'MONTO (Bs.)';

  ['B42', 'C42', 'E42'].forEach((ref) => {
    const c = wsResumen.getCell(ref);
    c.font = { name: fontFamily, size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = headerFill;
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const cuotaTributaria = Math.max(0, totVentasTax16 - totComprasTax16);
  const excedenteCredito = Math.max(0, totComprasTax16 - totVentasTax16);

  // Renglones 27 al 36 (Autoliquidación)
  wsResumen.getCell('B43').value = 27;
  wsResumen.getCell('C43').value = 'Total Cuota Tributaria del Período';
  wsResumen.getCell('E43').value = { formula: 'MAX(0, E20-E40)', result: cuotaTributaria };
  wsResumen.getCell('E43').numFmt = numFormat;

  wsResumen.getCell('B44').value = 28;
  wsResumen.getCell('C44').value = 'Excedente de Crédito Fiscal para el mes siguiente';
  wsResumen.getCell('E44').value = { formula: 'MAX(0, E40-E20)', result: excedenteCredito };
  wsResumen.getCell('E44').numFmt = numFormat;

  wsResumen.getCell('B45').value = 29;
  wsResumen.getCell('C45').value = 'Sub-total Impuesto a Pagar';
  wsResumen.getCell('E45').value = { formula: 'MAX(0, E43-E44)', result: cuotaTributaria };
  wsResumen.getCell('E45').numFmt = numFormat;

  wsResumen.getCell('B46').value = 30;
  wsResumen.getCell('C46').value = 'Retenciones Acumuladas por Descontar';
  wsResumen.getCell('D46').value = 0;
  wsResumen.getCell('D46').numFmt = numFormat;

  wsResumen.getCell('B47').value = 31;
  wsResumen.getCell('C47').value = 'Retenciones del Período';
  wsResumen.getCell('D47').value = 0;
  wsResumen.getCell('D47').numFmt = numFormat;

  wsResumen.getCell('B48').value = 32;
  wsResumen.getCell('C48').value = 'Total Retenciones';
  wsResumen.getCell('D48').value = { formula: 'D46+D47', result: 0 };
  wsResumen.getCell('D48').numFmt = numFormat;

  wsResumen.getCell('B49').value = 33;
  wsResumen.getCell('C49').value = 'Retenciones Soportadas y Descontadas en esta Declaración';
  wsResumen.getCell('E49').value = { formula: 'MIN(E45, D48)', result: 0 };
  wsResumen.getCell('E49').numFmt = numFormat;

  wsResumen.getCell('B50').value = 34;
  wsResumen.getCell('C50').value = 'Saldo de Retenciones de IVA no aplicado';
  wsResumen.getCell('E50').value = { formula: 'MAX(0, D48-E49)', result: 0 };
  wsResumen.getCell('E50').numFmt = numFormat;

  wsResumen.getCell('B51').value = 35;
  wsResumen.getCell('C51').value = 'Sub-total Impuesto a Pagar';

  // Renglón 36: Total a Pagar al SENIAT
  wsResumen.getCell('B52').value = 36;
  wsResumen.getCell('C52').value = 'Total a Pagar (SENIAT)';
  wsResumen.getCell('E52').value = { formula: 'MAX(0, E45-E49)', result: cuotaTributaria };
  wsResumen.getCell('E52').numFmt = numFormat;

  // Bordes y estilos en Hoja RESUMEN
  for (let r = 11; r <= 52; r++) {
    const row = wsResumen.getRow(r);
    row.font = { name: fontFamily, size: 9 };

    if ([11, 22, 42].includes(r)) continue;

    // Fila destacada Total Vtas (17), Total Debitos (20), Total Compras (31), Total Creditos (40), Total a Pagar (52)
    if ([17, 20, 31, 40].includes(r)) {
      row.font = { name: fontFamily, size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      ['B', 'C', 'D', 'E'].forEach((col) => {
        wsResumen.getCell(`${col}${r}`).fill = subHeaderFill;
      });
    }

    if (r === 52) {
      row.font = { name: fontFamily, size: 11, bold: true, color: { argb: 'FF92400E' } };
      ['B', 'C', 'D', 'E'].forEach((col) => {
        const c = wsResumen.getCell(`${col}${r}`);
        c.fill = totalFill;
        c.border = totalBorder;
      });
    } else {
      ['B', 'C', 'D', 'E'].forEach((col) => {
        wsResumen.getCell(`${col}${r}`).border = thinBorder;
      });
    }

    wsResumen.getCell(`B${r}`).alignment = { horizontal: 'center' };
  }

  // Anchos automáticos columnas resumen
  wsResumen.columns = [
    { width: 4 },  // A (margen)
    { width: 7 },  // B (N°)
    { width: 55 }, // C (Concepto)
    { width: 22 }, // D (Base Imponible)
    { width: 22 }  // E (Impuesto / Cuota)
  ];

  // =========================================================================
  // GENERAR ARCHIVO BINARIO (.XLSX) Y DESCARGAR AL USUARIO
  // =========================================================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

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
