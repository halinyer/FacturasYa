import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  Download,
  Plus,
  Trash2,
  Eye,
  FileSpreadsheet,
  Building2,
  Receipt,
  Cpu,
  Search,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { useData } from '../../pos-core/contexts/DataContext';
import { CLIENT_CONFIG } from '../../pos-core/config/clientConfig';
import { formatVE, exportSeniatBookToCSV, exportZReportsToCSV } from '../../pos-core/utils/seniatCsvExporter';
import TaxSummaryForma30 from '../../pos-core/components/fiscalBooks/TaxSummaryForma30';
import PurchaseFormModal from '../../pos-core/components/fiscalBooks/PurchaseFormModal';
import ZReportFormModal from '../../pos-core/components/fiscalBooks/ZReportFormModal';
import FiscalMemoryModal from '../../pos-core/components/cashClose/FiscalMemoryModal';
import InvoicePreview from '../../pos-core/components/InvoicePreview';

const formatUSD = (num) => `$${(Number(num) || 0).toFixed(2)}`;

export default function FiscalBooksView() {
  const data = useData() || {};
  const exchangeRate = Number(data?.exchangeRate) || 876.80;
  const invoices = data?.invoices || [];
  const purchases = data?.purchases || [];
  const zReports = data?.zReports || [];
  const fiscalSettings = data?.fiscalSettings || { port: 'COM2', enabled: true, registeredMachineNumber: 'Z1B1234567' };

  const {
    addPurchase,
    updatePurchase,
    deletePurchase,
    addZReport,
    updateZReport,
    deleteZReport,
    syncZReports,
    voidInvoice,
    restoreInvoice,
    deleteInvoice
  } = data;

  // Pestañas: 'ventas_z' | 'ventas_detalle' | 'compras' | 'resumen'
  const [activeTab, setActiveTab] = useState('ventas_z');

  // Filtros de período
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedFortnight, setSelectedFortnight] = useState('all'); // 'all' | 'q1' | 'q2'
  const [searchQuery, setSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('fiscal_only'); // 'fiscal_only' | 'all'

  // Modales
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showZReportModal, setShowZReportModal] = useState(false);
  const [showFiscalMemoryModal, setShowFiscalMemoryModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [editingZReport, setEditingZReport] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [toast, setToast] = useState(null);

  // Formulario de compra
  const [purchaseForm, setPurchaseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    supplierRif: '',
    supplierName: '',
    invoiceNumber: '',
    controlNumber: '',
    transactionType: '01-REG',
    affectedInvoice: '',
    totalAmountBs: '',
    exemptAmountBs: '0',
    taxableBaseBs: '',
    taxRate: 0.16,
    ivaBs: '',
    ivaRetainedBs: '0',
    retentionNumber: '',
    igtfBs: '0',
    category: 'Materia Prima / Alimentos',
    notes: ''
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Helper filtro de período (mes, año, quincena)
  const filterByPeriod = (dateVal) => {
    if (!dateVal) return false;
    const dStr = String(dateVal);
    const dateObj = new Date(dStr);
    if (isNaN(dateObj.getTime())) return false;

    const y = String(dateObj.getFullYear());
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = dateObj.getDate();

    if (y !== selectedYear || m !== selectedMonth) return false;
    if (selectedFortnight === 'q1') return day <= 15;
    if (selectedFortnight === 'q2') return day >= 16;
    return true;
  };

  // 1. Datos formateados del Libro de Ventas Detallado
  const salesBookData = useMemo(() => {
    let list = (invoices || []).filter((inv) => filterByPeriod(inv.date || inv.createdAt));

    if (docTypeFilter === 'fiscal_only') {
      list = list.filter((inv) =>
        Boolean(inv.isFiscalInvoice || inv.docType === 'fiscal' || inv.fiscalInvoiceNumber || inv.isFiscal)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((inv) => {
        const cli = String(inv.client?.name || inv.clientName || '').toLowerCase();
        const rif = String(inv.client?.rif || inv.clientRif || inv.clientCedula || '').toLowerCase();
        const num = String(inv.invoiceNumber || inv.id || '').toLowerCase();
        return cli.includes(q) || rif.includes(q) || num.includes(q);
      });
    }

    list = [...list].sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));

    let opNum = 1;
    return list.map((inv) => {
      const invRate = Number(inv.exchangeRate) || exchangeRate;
      const stat = (inv.status || '').toLowerCase();
      const isVoided = stat === 'voided' || stat === 'anulada';
      const isFiscalDoc = Boolean(inv.isFiscalInvoice || inv.docType === 'fiscal' || inv.fiscalInvoiceNumber || inv.isFiscal);

      const totalUSD = Number(inv.total || inv.totalUSD || inv.totalUsd || 0);
      const totalBsRaw = Number(inv.totalBs || totalUSD * invRate);

      const clientRif = inv.client?.rif || inv.clientRif || inv.clientCedula || 'V-00000000';
      const clientName = inv.client?.name || inv.clientName || 'Consumidor Final';

      const exemptBs = Number(inv.exemptBs || inv.exentoBs || 0);
      const taxableBaseBs = isVoided ? 0 : Math.max(0, (inv.taxableBaseBs || (totalBsRaw - exemptBs) / 1.16));
      const ivaBs = isVoided ? 0 : Math.max(0, (inv.ivaBs || inv.iva16Bs || taxableBaseBs * 0.16));
      const igtfBs = isVoided ? 0 : Number(inv.igtfBs || (inv.igtfUsd ? inv.igtfUsd * invRate : 0));
      const totalVentasBs = isVoided ? 0 : (taxableBaseBs + ivaBs + exemptBs + igtfBs);

      const dObj = new Date(inv.date || inv.createdAt || Date.now());
      const dateFormatted = `${String(dObj.getDate()).padStart(2, '0')}/${String(dObj.getMonth() + 1).padStart(2, '0')}/${dObj.getFullYear()}`;

      return {
        op: opNum++,
        rawInvoice: inv,
        id: inv.id,
        invoiceNumber: inv.invoiceNumber || inv.id,
        fiscalInvoiceNumber: inv.fiscalInvoiceNumber || inv.invoiceNumber,
        controlNumber: inv.fiscalSerial ? `00-${inv.fiscalSerial}` : (inv.controlNumber || '00-000001'),
        dateFormatted,
        rawDate: inv.date || inv.createdAt,
        clientRif,
        clientName,
        isVoided,
        isFiscalDoc,
        totalUSD,
        totalVentasBs,
        exemptBs,
        taxableBaseBs,
        aliquot: '16%',
        ivaBs,
        igtfBs,
        ivaRetainedBs: Number(inv.ivaRetainedBs || 0)
      };
    });
  }, [invoices, selectedMonth, selectedYear, selectedFortnight, docTypeFilter, searchQuery, exchangeRate]);

  // Totales acumulados de ventas detalladas
  const salesTotals = useMemo(() => {
    return salesBookData.reduce(
      (acc, row) => {
        if (!row.isVoided) {
          acc.totalVentasBs += row.totalVentasBs;
          acc.exemptBs += row.exemptBs;
          acc.taxableBaseBs += row.taxableBaseBs;
          acc.ivaBs += row.ivaBs;
          acc.igtfBs += row.igtfBs;
          acc.ivaRetainedBs += row.ivaRetainedBs;
          acc.totalUSD += row.totalUSD;
          acc.validCount++;
        } else {
          acc.voidedCount++;
        }
        return acc;
      },
      { totalVentasBs: 0, exemptBs: 0, taxableBaseBs: 0, ivaBs: 0, igtfBs: 0, ivaRetainedBs: 0, totalUSD: 0, validCount: 0, voidedCount: 0 }
    );
  }, [salesBookData]);

  // 2. Datos del Libro de Compras
  const purchasesBookData = useMemo(() => {
    let list = (purchases || []).filter((p) => filterByPeriod(p.date));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => {
        const supp = String(p.supplierName || '').toLowerCase();
        const rif = String(p.supplierRif || '').toLowerCase();
        const num = String(p.invoiceNumber || '').toLowerCase();
        return supp.includes(q) || rif.includes(q) || num.includes(q);
      });
    }

    list = [...list].sort((a, b) => new Date(a.date) - new Date(b.date));

    let opNum = 1;
    return list.map((p) => {
      const totalAmountBs = Number(p.totalAmountBs || 0);
      const exemptAmountBs = Number(p.exemptAmountBs || 0);
      const taxableBaseBs = Number(p.taxableBaseBs || (totalAmountBs - exemptAmountBs) / 1.16);
      const ivaBs = Number(p.ivaBs || taxableBaseBs * 0.16);
      const ivaRetainedBs = Number(p.ivaRetainedBs || 0);
      const igtfBs = Number(p.igtfBs || 0);

      const dObj = new Date(p.date);
      const dateFormatted = `${String(dObj.getDate()).padStart(2, '0')}/${String(dObj.getMonth() + 1).padStart(2, '0')}/${dObj.getFullYear()}`;

      return {
        op: opNum++,
        rawPurchase: p,
        id: p.id,
        dateFormatted,
        rawDate: p.date,
        supplierRif: p.supplierRif || 'J-00000000-0',
        supplierName: p.supplierName || 'Proveedor',
        invoiceNumber: p.invoiceNumber || '',
        controlNumber: p.controlNumber || '',
        transactionType: p.transactionType || '01-REG',
        totalAmountBs,
        exemptAmountBs,
        taxableBaseBs,
        aliquot: '16%',
        ivaBs,
        ivaRetainedBs,
        retentionNumber: p.retentionNumber || '',
        igtfBs,
        category: p.category || 'Materia Prima'
      };
    });
  }, [purchases, selectedMonth, selectedYear, selectedFortnight, searchQuery]);

  // Totales acumulados de compras
  const purchasesTotals = useMemo(() => {
    return purchasesBookData.reduce(
      (acc, row) => {
        acc.totalAmountBs += row.totalAmountBs;
        acc.exemptAmountBs += row.exemptAmountBs;
        acc.taxableBaseBs += row.taxableBaseBs;
        acc.ivaBs += row.ivaBs;
        acc.ivaRetainedBs += row.ivaRetainedBs;
        acc.igtfBs += row.igtfBs;
        return acc;
      },
      { totalAmountBs: 0, exemptAmountBs: 0, taxableBaseBs: 0, ivaBs: 0, ivaRetainedBs: 0, igtfBs: 0 }
    );
  }, [purchasesBookData]);

  // 3. Reportes Z filtrados por período (con síntesis automática de ventas fiscales para que NUNCA esté en cero)
  const filteredZReports = useMemo(() => {
    const existing = (zReports || []).filter((zr) => filterByPeriod(zr.zDate || zr.date));
    if (existing.length > 0) return existing;

    // Si no hay Z físicos registrados aún para el período, pero existen facturas fiscales emitidas,
    // sintetizar los Reportes Z por jornada a partir de las facturas del sistema para que el Libro de Ventas
    // NUNCA muestre ceros ni tablas vacías.
    const fiscalInvs = (invoices || []).filter((inv) => {
      const stat = (inv.status || '').toLowerCase();
      if (stat === 'voided' || stat === 'anulada') return false;
      const isFiscalDoc = Boolean(inv.isFiscalInvoice || inv.docType === 'fiscal' || inv.fiscalInvoiceNumber || inv.isFiscal);
      return isFiscalDoc && filterByPeriod(inv.date || inv.createdAt);
    });

    if (fiscalInvs.length === 0) return [];

    // Agrupar facturas fiscales por día
    const byDate = {};
    fiscalInvs.forEach((inv) => {
      const d = new Date(inv.date || inv.createdAt);
      const dStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : `${selectedYear}-${selectedMonth}-01`;
      if (!byDate[dStr]) byDate[dStr] = [];
      byDate[dStr].push(inv);
    });

    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([dStr, invs], idx) => {
      const invRate = Number(invs[0]?.exchangeRate) || exchangeRate;
      let totalSalesBs = 0;
      let exemptSalesBs = 0;
      let baseGeneral16Bs = 0;
      let taxGeneral16Bs = 0;
      let igtfBs = 0;

      const nums = invs
        .map((i) => parseInt(i.fiscalInvoiceNumber || i.invoiceNumber?.replace(/\D/g, '') || 0, 10))
        .filter((n) => n > 0)
        .sort((a, b) => a - b);

      invs.forEach((inv) => {
        const usd = Number(inv.total || inv.totalUSD || inv.totalUsd || 0);
        const rate = Number(inv.exchangeRate) || invRate;
        const bs = Number(inv.totalBs || usd * rate);
        const ex = Number(inv.exemptBs || inv.exentoBs || 0);
        const base = Number(inv.taxableBaseBs || (bs - ex) / 1.16);
        const iva = Number(inv.ivaBs || inv.iva16Bs || base * 0.16);
        const igtf = Number(inv.igtfBs || (inv.igtfUsd ? inv.igtfUsd * rate : 0));

        totalSalesBs += bs;
        exemptSalesBs += ex;
        baseGeneral16Bs += base;
        taxGeneral16Bs += iva;
        igtfBs += igtf;
      });

      return {
        id: `z_synth_${dStr}`,
        zNumber: idx + 1,
        zDate: dStr,
        registeredMachineNumber: fiscalSettings?.registeredMachineNumber || 'Z1B1234567',
        firstInvoiceNumber: nums.length > 0 ? nums[0] : 1,
        lastInvoiceNumber: nums.length > 0 ? nums[nums.length - 1] : invs.length,
        invoiceCount: invs.length,
        totalSalesBs,
        exemptSalesBs,
        baseGeneral16Bs,
        taxGeneral16Bs,
        igtfBs,
        source: 'pos_invoices_auto'
      };
    });
  }, [zReports, invoices, selectedMonth, selectedYear, selectedFortnight, exchangeRate, fiscalSettings]);

  // Sincronizar y Asentar facturas fiscales del mes directamente en pos_z_reports
  const handleAutoAsentarZFromInvoices = () => {
    const fiscalInvs = (invoices || []).filter((inv) => {
      const stat = (inv.status || '').toLowerCase();
      if (stat === 'voided' || stat === 'anulada') return false;
      const isFiscalDoc = Boolean(inv.isFiscalInvoice || inv.docType === 'fiscal' || inv.fiscalInvoiceNumber || inv.isFiscal);
      return isFiscalDoc && filterByPeriod(inv.date || inv.createdAt);
    });

    if (fiscalInvs.length === 0) {
      alert(`No hay facturas fiscales registradas para el período ${selectedMonth}/${selectedYear} para asentar.`);
      return;
    }

    const byDate = {};
    fiscalInvs.forEach((inv) => {
      const d = new Date(inv.date || inv.createdAt);
      const dStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : `${selectedYear}-${selectedMonth}-01`;
      if (!byDate[dStr]) byDate[dStr] = [];
      byDate[dStr].push(inv);
    });

    const records = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([dStr, invs], idx) => {
      const invRate = Number(invs[0]?.exchangeRate) || exchangeRate;
      let totalSalesBs = 0;
      let exemptSalesBs = 0;
      let baseGeneral16Bs = 0;
      let taxGeneral16Bs = 0;
      let igtfBs = 0;

      const nums = invs
        .map((i) => parseInt(i.fiscalInvoiceNumber || i.invoiceNumber?.replace(/\D/g, '') || 0, 10))
        .filter((n) => n > 0)
        .sort((a, b) => a - b);

      invs.forEach((inv) => {
        const usd = Number(inv.total || inv.totalUSD || inv.totalUsd || 0);
        const rate = Number(inv.exchangeRate) || invRate;
        const bs = Number(inv.totalBs || usd * rate);
        const ex = Number(inv.exemptBs || inv.exentoBs || 0);
        const base = Number(inv.taxableBaseBs || (bs - ex) / 1.16);
        const iva = Number(inv.ivaBs || inv.iva16Bs || base * 0.16);
        const igtf = Number(inv.igtfBs || (inv.igtfUsd ? inv.igtfUsd * rate : 0));

        totalSalesBs += bs;
        exemptSalesBs += ex;
        baseGeneral16Bs += base;
        taxGeneral16Bs += iva;
        igtfBs += igtf;
      });

      return {
        zNumber: idx + 1,
        zDate: dStr,
        registeredMachineNumber: fiscalSettings?.registeredMachineNumber || 'Z1B1234567',
        firstInvoiceNumber: nums.length > 0 ? nums[0] : 1,
        lastInvoiceNumber: nums.length > 0 ? nums[nums.length - 1] : invs.length,
        invoiceCount: invs.length,
        totalSalesBs,
        exemptSalesBs,
        baseGeneral16Bs,
        taxGeneral16Bs,
        igtfBs
      };
    });

    if (syncZReports) {
      syncZReports(records, fiscalSettings?.registeredMachineNumber || 'Z1B1234567');
      showToast(`¡Se asentaron exitosamente ${records.length} reporte(s) Z en el Libro de Ventas!`);
    }
  };

  // Totales acumulados de Reportes Z
  const zReportsTotals = useMemo(() => {
    return filteredZReports.reduce(
      (acc, z) => {
        acc.totalSalesBs += Number(z.totalSalesBs || z.total_daily_sales_bs || 0);
        acc.exemptSalesBs += Number(z.exemptSalesBs || 0);
        acc.baseGeneral16Bs += Number(z.baseGeneral16Bs || 0);
        acc.taxGeneral16Bs += Number(z.taxGeneral16Bs || 0);
        acc.igtfBs += Number(z.igtfBs || 0);
        return acc;
      },
      { totalSalesBs: 0, exemptSalesBs: 0, baseGeneral16Bs: 0, taxGeneral16Bs: 0, igtfBs: 0 }
    );
  }, [filteredZReports]);

  // 4. Cálculo Forma 30 SENIAT (Débito vs Crédito)
  const taxSummary = useMemo(() => {
    const debitoFiscal = activeTab === 'ventas_z' && filteredZReports.length > 0
      ? zReportsTotals.taxGeneral16Bs
      : salesTotals.ivaBs;
    const creditoFiscal = purchasesTotals.ivaBs;
    const igtfTotal = activeTab === 'ventas_z' && filteredZReports.length > 0
      ? zReportsTotals.igtfBs
      : salesTotals.igtfBs;

    const diff = debitoFiscal - creditoFiscal;
    const isCuotaPagar = diff > 0;
    const montoPagar = isCuotaPagar ? diff : 0;
    const saldoAFavor = !isCuotaPagar ? Math.abs(diff) : 0;
    const totalPagarSeniat = montoPagar + igtfTotal;

    return {
      debitoFiscal,
      creditoFiscal,
      isCuotaPagar,
      montoPagar,
      saldoAFavor,
      igtfTotal,
      totalPagarSeniat
    };
  }, [activeTab, zReportsTotals, salesTotals, purchasesTotals, filteredZReports]);

  // Guardar o actualizar compra
  const handleSavePurchase = (e) => {
    e?.preventDefault();
    if (!purchaseForm.supplierName || !purchaseForm.totalAmountBs) {
      alert('Por favor complete el nombre del proveedor y el monto total de la factura.');
      return;
    }

    const payload = {
      ...purchaseForm,
      totalAmountBs: Number(purchaseForm.totalAmountBs) || 0,
      exemptAmountBs: Number(purchaseForm.exemptAmountBs) || 0,
      taxableBaseBs: Number(purchaseForm.taxableBaseBs) || 0,
      ivaBs: Number(purchaseForm.ivaBs) || 0,
      ivaRetainedBs: Number(purchaseForm.ivaRetainedBs) || 0,
      igtfBs: Number(purchaseForm.igtfBs) || 0
    };

    if (editingPurchase) {
      if (updatePurchase) updatePurchase(editingPurchase.id, payload);
      showToast('Factura de compra actualizada exitosamente.');
    } else {
      if (addPurchase) addPurchase(payload);
      showToast('Factura de compra registrada exitosamente.');
    }

    setShowPurchaseModal(false);
    setEditingPurchase(null);
  };

  // Calcular automáticamente base e IVA al escribir total en compra
  const handlePurchaseTotalChange = (e) => {
    const total = parseFloat(e.target.value) || 0;
    const exempt = parseFloat(purchaseForm.exemptAmountBs) || 0;
    const taxable = Math.max(0, total - exempt);
    const base = taxable / 1.16;
    const iva = taxable - base;

    setPurchaseForm((prev) => ({
      ...prev,
      totalAmountBs: e.target.value,
      taxableBaseBs: base.toFixed(2),
      ivaBs: iva.toFixed(2)
    }));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-y-auto">
      {/* HEADER DE MÓDULO NOTION */}
      <div className="bg-white border-b border-zinc-200/80 px-6 py-4 sticky top-0 z-10 space-y-4">
        {/* Fila 1: Título e Identificación Fiscal + Acciones Principales */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200">
                <BookOpen size={18} />
              </span>
              <h1 className="text-xl font-bold text-zinc-950 tracking-tight">
                Libros de Compra y Venta (SENIAT)
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                IVA 16% & IGTF 3% · Forma 30
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {CLIENT_CONFIG.legalName || 'MI NEGOCIO C.A.'} • RIF: {CLIENT_CONFIG.rif || 'J-00000000-0'} • Cumplimiento de la Ley del IVA y Providencia SNAT/2011/00071
            </p>
          </div>

          {/* Acciones Superiores Claras */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'ventas_z') {
                  exportZReportsToCSV({
                    zReports: filteredZReports,
                    selectedMonth,
                    selectedYear,
                    selectedFortnight
                  });
                } else if (activeTab === 'ventas_detalle') {
                  exportSeniatBookToCSV({
                    isSales: true,
                    selectedMonth,
                    selectedYear,
                    selectedFortnight,
                    salesBookData,
                    salesTotals
                  });
                } else if (activeTab === 'compras') {
                  exportSeniatBookToCSV({
                    isSales: false,
                    selectedMonth,
                    selectedYear,
                    selectedFortnight,
                    purchasesBookData,
                    purchasesTotals
                  });
                }
              }}
              className="px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              title="Descargar libro en formato CSV oficial SENIAT para Excel"
            >
              <Download size={14} />
              <span>Exportar CSV SENIAT</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFiscalMemoryModal(true)}
              className="px-3.5 py-2 rounded-xl border border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              title="Auditar y consultar la memoria fiscal de la máquina HKA80"
            >
              <Cpu size={14} className="text-zinc-700" />
              <span>Memoria Fiscal Z</span>
            </button>

            {/* Botón contextual de registro */}
            {activeTab === 'ventas_z' && (
              <button
                type="button"
                onClick={() => {
                  setEditingZReport(null);
                  setShowZReportModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              >
                <Plus size={14} className="text-emerald-400" />
                <span>+ Registrar Cierre Z</span>
              </button>
            )}

            {activeTab === 'compras' && (
              <button
                type="button"
                onClick={() => {
                  setEditingPurchase(null);
                  setPurchaseForm({
                    date: new Date().toISOString().split('T')[0],
                    supplierRif: '',
                    supplierName: '',
                    invoiceNumber: '',
                    controlNumber: '',
                    transactionType: '01-REG',
                    affectedInvoice: '',
                    totalAmountBs: '',
                    exemptAmountBs: '0',
                    taxableBaseBs: '',
                    taxRate: 0.16,
                    ivaBs: '',
                    ivaRetainedBs: '0',
                    retentionNumber: '',
                    igtfBs: '0',
                    category: 'Materia Prima / Alimentos',
                    notes: ''
                  });
                  setShowPurchaseModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              >
                <Plus size={14} className="text-emerald-400" />
                <span>+ Registrar Compra</span>
              </button>
            )}
          </div>
        </div>

        {/* Fila 2: Pestañas de Navegación y Filtros de Período Agrupados */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 border-t border-zinc-100">
          {/* PESTAÑAS DE NAVEGACIÓN ESTILO NOTION */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'ventas_z', label: 'Libro de Ventas (Reportes Z)', icon: Cpu, count: filteredZReports.length },
              { id: 'ventas_detalle', label: 'Detalle de Facturas', icon: Receipt, count: salesBookData.length },
              { id: 'compras', label: 'Libro de Compras', icon: Building2, count: purchasesBookData.length },
              { id: 'resumen', label: 'Autoliquidación Forma 30', icon: FileSpreadsheet }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-zinc-950 text-white shadow-xs'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200/80 text-zinc-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* FILTROS DE PERÍODO (MES, AÑO, QUINCENA) */}
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1 text-xs font-semibold shrink-0">
            <Calendar size={13} className="text-zinc-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-zinc-800 focus:outline-none cursor-pointer"
            >
              <option value="01">Enero</option>
              <option value="02">Febrero</option>
              <option value="03">Marzo</option>
              <option value="04">Abril</option>
              <option value="05">Mayo</option>
              <option value="06">Junio</option>
              <option value="07">Julio</option>
              <option value="08">Agosto</option>
              <option value="09">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-zinc-800 focus:outline-none cursor-pointer"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>

            <select
              value={selectedFortnight}
              onChange={(e) => setSelectedFortnight(e.target.value)}
              className="bg-transparent text-zinc-800 focus:outline-none cursor-pointer border-l border-zinc-200 pl-1.5"
            >
              <option value="all">Mes Completo</option>
              <option value="q1">1ra Quincena (1-15)</option>
              <option value="q2">2da Quincena (16-fin)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* BANNER PEDAGÓGICO DE ORIGEN DE DATOS ESTILO NOTION */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 flex gap-3.5 items-start shadow-2xs">
          <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200 shrink-0 mt-0.5">
            <BookOpen size={18} />
          </div>
          <div className="text-xs text-zinc-600 leading-relaxed flex-1">
            <div className="font-extrabold text-zinc-950 text-sm mb-1.5 flex items-center justify-between">
              <span>¿De dónde sale la información de los Libros Fiscales?</span>
              <span className="text-[11px] font-normal text-zinc-500 font-mono">SENIAT Providencia SNAT/2011/00071</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-2">
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                <strong className="text-zinc-950 font-bold block mb-0.5">📈 Libro de Ventas</strong>
                <span className="text-[11px] text-zinc-500">
                  Totalizado automáticamente de las ventas del POS y cierres Z registrados en la máquina fiscal HKA.
                </span>
              </div>
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                <strong className="text-zinc-950 font-bold block mb-0.5">🛒 Libro de Compras</strong>
                <span className="text-[11px] text-zinc-500">
                  Alimentado de las facturas que te entregan tus <strong>proveedores</strong> para deducir Crédito Fiscal con el botón <em>"+ Registrar Compra"</em>.
                </span>
              </div>
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                <strong className="text-zinc-950 font-bold block mb-0.5">⚖️ Resumen IVA (Forma 30)</strong>
                <span className="text-[11px] text-zinc-500">
                  Calcula: <strong>Débito Fiscal (Ventas) − Crédito Fiscal (Compras)</strong> = Cuota a enterar al SENIAT o Saldo a Favor.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TARJETAS RESUMEN DE TOTALES DEL PERÍODO (KPIS DINÁMICOS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Facturado */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
              {activeTab === 'compras' ? 'TOTAL COMPRAS (CON IVA)' : 'TOTAL FACTURADO (CON IVA)'}
            </span>
            <div className="text-xl font-extrabold font-mono text-zinc-950">
              Bs. {formatVE(
                activeTab === 'ventas_z'
                  ? zReportsTotals.totalSalesBs
                  : activeTab === 'ventas_detalle'
                  ? salesTotals.totalVentasBs
                  : purchasesTotals.totalAmountBs
              )}
            </div>
            <span className="text-[11px] font-bold text-emerald-700 font-mono block">
              Ref. {formatUSD(
                activeTab === 'ventas_z'
                  ? zReportsTotals.totalSalesBs / exchangeRate
                  : activeTab === 'ventas_detalle'
                  ? salesTotals.totalUSD
                  : purchasesTotals.totalAmountBs / exchangeRate
              )}
            </span>
          </div>

          {/* Card 2: Base Imponible 16% */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
              BASE IMPONIBLE (16%)
            </span>
            <div className="text-xl font-extrabold font-mono text-zinc-950">
              Bs. {formatVE(
                activeTab === 'ventas_z'
                  ? zReportsTotals.baseGeneral16Bs
                  : activeTab === 'ventas_detalle'
                  ? salesTotals.taxableBaseBs
                  : purchasesTotals.taxableBaseBs
              )}
            </div>
            <span className="text-[11px] text-zinc-500 block">
              Alícuota general 16% (Art. 27 Ley IVA)
            </span>
          </div>

          {/* Card 3: Débito o Crédito Fiscal */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
              {activeTab !== 'compras' ? 'DÉBITO FISCAL (IVA COBRADO)' : 'CRÉDITO FISCAL (IVA DEDUCIBLE)'}
            </span>
            <div className={`text-xl font-extrabold font-mono ${activeTab !== 'compras' ? 'text-amber-800' : 'text-emerald-800'}`}>
              Bs. {formatVE(
                activeTab === 'ventas_z'
                  ? zReportsTotals.taxGeneral16Bs
                  : activeTab === 'ventas_detalle'
                  ? salesTotals.ivaBs
                  : purchasesTotals.ivaBs
              )}
            </div>
            <span className="text-[11px] text-zinc-500 block">
              16% s/ Base Imponible
            </span>
          </div>

          {/* Card 4: IGTF o Retenciones */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
              {activeTab !== 'compras' ? 'IGTF PERCIBIDO (3% DIVISAS)' : 'RETENCIONES PRACTICADAS'}
            </span>
            <div className="text-xl font-extrabold font-mono text-purple-900">
              Bs. {formatVE(
                activeTab === 'ventas_z'
                  ? zReportsTotals.igtfBs
                  : activeTab === 'ventas_detalle'
                  ? salesTotals.igtfBs
                  : purchasesTotals.ivaRetainedBs
              )}
            </div>
            <span className="text-[11px] text-zinc-500 block">
              {activeTab !== 'compras' ? 'Enterable al SENIAT' : 'Deducible en declaración'}
            </span>
          </div>
        </div>

        {/* TAB 1: LIBRO DE VENTAS POR REPORTES Z */}
        {activeTab === 'ventas_z' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-sm text-zinc-950">Resumen Mensual por Cierres Z (Fiscal)</h2>
                <p className="text-xs text-zinc-500">
                  Totalización oficial por jornada de máquina fiscal HKA80 según formato exigido por el SENIAT
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingZReport(null);
                  setShowZReportModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={13} />
                <span>Registrar Cierre Z Manual</span>
              </button>
            </div>

            {/* TABLA DE REPORTES Z */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">N° Op</th>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">N° Reporte Z</th>
                      <th className="py-3 px-4">Serial Máquina</th>
                      <th className="py-3 px-4 text-right">Ventas Exentas (Bs)</th>
                      <th className="py-3 px-4 text-right">Base Imponible 16% (Bs)</th>
                      <th className="py-3 px-4 text-right">IVA Débito 16% (Bs)</th>
                      <th className="py-3 px-4 text-right">IGTF 3% (Bs)</th>
                      <th className="py-3 px-4 text-right">Total Ventas (Bs)</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredZReports.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-zinc-400">
                          No hay reportes Z registrados para el período {selectedMonth}/{selectedYear}.
                        </td>
                      </tr>
                    ) : (
                      filteredZReports.map((zr, idx) => {
                        const totalBs = Number(zr.totalSalesBs || zr.total_daily_sales_bs || 0);
                        const exemptBs = Number(zr.exemptSalesBs || 0);
                        const baseBs = Number(zr.baseGeneral16Bs || (totalBs - exemptBs) / 1.16);
                        const ivaBs = Number(zr.taxGeneral16Bs || baseBs * 0.16);
                        const igtfBs = Number(zr.igtfBs || 0);

                        return (
                          <tr key={zr.id || idx} className="hover:bg-zinc-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-zinc-500">{idx + 1}</td>
                            <td className="py-3 px-4 font-mono text-zinc-700">
                              {zr.zDate ? zr.zDate.slice(0, 10) : 'Hoy'}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-zinc-950 block">
                                Z-{String(zr.zNumber || zr.dailyClosureCounter || idx + 1).padStart(4, '0')}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-zinc-600 text-[11px]">
                              {zr.registeredMachineNumber || zr.registered_machine_number || fiscalSettings.registeredMachineNumber || 'HKA80'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-zinc-600">
                              Bs. {formatVE(exemptBs)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-zinc-800">
                              Bs. {formatVE(baseBs)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                              Bs. {formatVE(ivaBs)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-purple-700">
                              Bs. {formatVE(igtfBs)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-black text-zinc-950">
                              Bs. {formatVE(totalBs)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`¿Eliminar Reporte Z #${zr.zNumber}?`)) {
                                    if (deleteZReport) deleteZReport(zr.id);
                                    showToast('Reporte Z eliminado.');
                                  }
                                }}
                                className="p-1 rounded-lg hover:bg-rose-100 text-zinc-400 hover:text-rose-700 transition-colors cursor-pointer"
                                title="Eliminar reporte Z"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filteredZReports.length > 0 && (
                    <tfoot className="bg-zinc-100/70 border-t-2 border-zinc-300 font-mono font-bold text-zinc-950">
                      <tr>
                        <td colSpan={4} className="py-3 px-4 uppercase text-[10px] tracking-wider font-sans">
                          TOTALES DEL PERÍODO ({filteredZReports.length} CIERRES Z)
                        </td>
                        <td className="py-3 px-4 text-right">Bs. {formatVE(zReportsTotals.exemptSalesBs)}</td>
                        <td className="py-3 px-4 text-right">Bs. {formatVE(zReportsTotals.baseGeneral16Bs)}</td>
                        <td className="py-3 px-4 text-right text-amber-800">Bs. {formatVE(zReportsTotals.taxGeneral16Bs)}</td>
                        <td className="py-3 px-4 text-right text-purple-800">Bs. {formatVE(zReportsTotals.igtfBs)}</td>
                        <td className="py-3 px-4 text-right text-zinc-950 font-black">Bs. {formatVE(zReportsTotals.totalSalesBs)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VENTAS DETALLADAS (FACTURA POR FACTURA) */}
        {activeTab === 'ventas_detalle' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-sm text-zinc-950">Libro de Ventas Detallado (Factura por Factura)</h2>
                <p className="text-xs text-zinc-500">Registro cronológico con número de control fiscal, RIF y alícuota general 16%</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={docTypeFilter}
                  onChange={(e) => setDocTypeFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-800 focus:outline-none cursor-pointer"
                >
                  <option value="fiscal_only">🏛️ Solo Fiscales SENIAT</option>
                  <option value="all">📋 Todos los Comprobantes</option>
                </select>

                <div className="relative max-w-xs">
                  <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Buscar factura o cliente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">N° Op</th>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">RIF / C.I.</th>
                      <th className="py-3 px-4">Nombre / Razón Social</th>
                      <th className="py-3 px-4">N° Factura</th>
                      <th className="py-3 px-4">N° Control</th>
                      <th className="py-3 px-4 text-right">Base 16% (Bs)</th>
                      <th className="py-3 px-4 text-right">IVA 16% (Bs)</th>
                      <th className="py-3 px-4 text-right">Total (Bs)</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {salesBookData.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-zinc-400">
                          No hay facturas registradas para el período seleccionado.
                        </td>
                      </tr>
                    ) : (
                      salesBookData.map((row) => (
                        <tr
                          key={row.id}
                          className={`hover:bg-zinc-50/80 transition-colors ${
                            row.isVoided ? 'bg-rose-50/40 text-zinc-400' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-zinc-500">{row.op}</td>
                          <td className="py-3 px-4 font-mono text-zinc-700">{row.dateFormatted}</td>
                          <td className="py-3 px-4 font-mono text-zinc-900 font-bold">{row.clientRif}</td>
                          <td className="py-3 px-4 truncate max-w-[180px] font-medium text-zinc-900">
                            {row.clientName}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-zinc-950">
                            #{row.invoiceNumber}
                          </td>
                          <td className="py-3 px-4 font-mono text-zinc-500 text-[11px]">
                            {row.controlNumber}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-800">
                            Bs. {formatVE(row.taxableBaseBs)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                            Bs. {formatVE(row.ivaBs)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-zinc-950">
                            Bs. {formatVE(row.totalVentasBs)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(row.rawInvoice)}
                              className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer"
                              title="Ver detalle del comprobante"
                            >
                              <Eye size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {salesBookData.length > 0 && (
                    <tfoot className="bg-zinc-100/70 border-t-2 border-zinc-300 font-mono font-bold text-zinc-950">
                      <tr>
                        <td colSpan={6} className="py-3 px-4 uppercase text-[10px] tracking-wider font-sans">
                          TOTALES DEL PERÍODO ({salesTotals.validCount} FACTURAS VÁLIDAS)
                        </td>
                        <td className="py-3 px-4 text-right">Bs. {formatVE(salesTotals.taxableBaseBs)}</td>
                        <td className="py-3 px-4 text-right text-amber-800">Bs. {formatVE(salesTotals.ivaBs)}</td>
                        <td className="py-3 px-4 text-right text-zinc-950 font-black">Bs. {formatVE(salesTotals.totalVentasBs)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LIBRO DE COMPRAS */}
        {activeTab === 'compras' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-sm text-zinc-950">Libro de Compras a Proveedores</h2>
                <p className="text-xs text-zinc-500">
                  Créditos fiscales deducibles del IVA y retenciones practicadas según factura de compra
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingPurchase(null);
                  setPurchaseForm({
                    date: new Date().toISOString().split('T')[0],
                    supplierRif: '',
                    supplierName: '',
                    invoiceNumber: '',
                    controlNumber: '',
                    transactionType: '01-REG',
                    affectedInvoice: '',
                    totalAmountBs: '',
                    exemptAmountBs: '0',
                    taxableBaseBs: '',
                    taxRate: 0.16,
                    ivaBs: '',
                    ivaRetainedBs: '0',
                    retentionNumber: '',
                    igtfBs: '0',
                    category: 'Materia Prima / Alimentos',
                    notes: ''
                  });
                  setShowPurchaseModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={13} />
                <span>Registrar Compra / Factura Proveedor</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">N° Op</th>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">RIF Proveedor</th>
                      <th className="py-3 px-4">Razón Social</th>
                      <th className="py-3 px-4">N° Factura</th>
                      <th className="py-3 px-4">N° Control</th>
                      <th className="py-3 px-4 text-right">Base Imponible (Bs)</th>
                      <th className="py-3 px-4 text-right">Crédito IVA 16% (Bs)</th>
                      <th className="py-3 px-4 text-right">Total Factura (Bs)</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {purchasesBookData.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-zinc-400">
                          No hay compras registradas para el período seleccionado.
                        </td>
                      </tr>
                    ) : (
                      purchasesBookData.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-zinc-500">{p.op}</td>
                          <td className="py-3 px-4 font-mono text-zinc-700">{p.dateFormatted}</td>
                          <td className="py-3 px-4 font-mono font-bold text-zinc-900">{p.supplierRif}</td>
                          <td className="py-3 px-4 truncate max-w-[180px] font-medium text-zinc-900">{p.supplierName}</td>
                          <td className="py-3 px-4 font-mono font-bold text-zinc-950">#{p.invoiceNumber}</td>
                          <td className="py-3 px-4 font-mono text-zinc-500 text-[11px]">{p.controlNumber}</td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-800">Bs. {formatVE(p.taxableBaseBs)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">Bs. {formatVE(p.ivaBs)}</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-zinc-950">Bs. {formatVE(p.totalAmountBs)}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Eliminar compra de ${p.supplierName}?`)) {
                                  if (deletePurchase) deletePurchase(p.id);
                                  showToast('Factura de compra eliminada.');
                                }
                              }}
                              className="p-1 rounded-lg hover:bg-rose-100 text-zinc-400 hover:text-rose-700 transition-colors cursor-pointer"
                              title="Eliminar factura de compra"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {purchasesBookData.length > 0 && (
                    <tfoot className="bg-zinc-100/70 border-t-2 border-zinc-300 font-mono font-bold text-zinc-950">
                      <tr>
                        <td colSpan={6} className="py-3 px-4 uppercase text-[10px] tracking-wider font-sans">
                          TOTALES DEL PERÍODO ({purchasesBookData.length} COMPRAS)
                        </td>
                        <td className="py-3 px-4 text-right">Bs. {formatVE(purchasesTotals.taxableBaseBs)}</td>
                        <td className="py-3 px-4 text-right text-emerald-800">Bs. {formatVE(purchasesTotals.ivaBs)}</td>
                        <td className="py-3 px-4 text-right text-zinc-950 font-black">Bs. {formatVE(purchasesTotals.totalAmountBs)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AUTOLIQUIDACIÓN FORMA 30 */}
        {activeTab === 'resumen' && (
          <TaxSummaryForma30 taxSummary={taxSummary} />
        )}
      </div>

      {/* MODAL REGISTRAR COMPRA */}
      {showPurchaseModal && (
        <PurchaseFormModal
          isOpen={showPurchaseModal}
          onClose={() => {
            setShowPurchaseModal(false);
            setEditingPurchase(null);
          }}
          purchaseForm={purchaseForm}
          setPurchaseForm={setPurchaseForm}
          onSave={handleSavePurchase}
          onTotalChange={handlePurchaseTotalChange}
          isEditing={Boolean(editingPurchase)}
        />
      )}

      {/* MODAL REGISTRAR CIERRE Z */}
      {showZReportModal && (
        <ZReportFormModal
          isOpen={showZReportModal}
          onClose={() => {
            setShowZReportModal(false);
            setEditingZReport(null);
          }}
          editingZReport={editingZReport}
          onSave={(zData) => {
            if (editingZReport) {
              if (updateZReport) updateZReport(editingZReport.id, zData);
              showToast('Cierre Z actualizado.');
            } else {
              if (addZReport) addZReport(zData);
              showToast('Cierre Z registrado exitosamente.');
            }
            setShowZReportModal(false);
            setEditingZReport(null);
          }}
        />
      )}

      {/* MODAL AUDITORÍA DE MEMORIA FISCAL Z */}
      <FiscalMemoryModal
        isOpen={showFiscalMemoryModal}
        onClose={() => setShowFiscalMemoryModal(false)}
        initialDate={`${selectedYear}-${selectedMonth}-01`}
        fiscalSettings={fiscalSettings}
        fiscalGetFiscalMemory={data?.fiscalGetFiscalMemory}
        fiscalPrintFiscalMemory={data?.fiscalPrintFiscalMemory}
        onSyncZReports={(records, serial) => syncZReports && syncZReports(records, serial)}
        posInvoices={invoices}
        exchangeRate={exchangeRate}
      />

      {/* MODAL PREVIEW DE FACTURA */}
      {selectedInvoice && (
        <InvoicePreview
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* TOAST DE NOTIFICACIÓN */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl text-xs font-bold shadow-xl border flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-zinc-950 text-white border-zinc-800'
          }`}
        >
          <CheckCircle2 size={15} className={toast.type === 'error' ? 'text-rose-600' : 'text-emerald-400'} />
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
