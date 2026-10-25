import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { CLIENT_CONFIG } from '../config/clientConfig';
import { formatVE, exportSeniatBookToCSV } from '../utils/seniatCsvExporter';
import TaxSummaryForma30 from '../components/fiscalBooks/TaxSummaryForma30';
import PurchaseFormModal from '../components/fiscalBooks/PurchaseFormModal';
import { 
  BookOpen, 
  FileSpreadsheet, 
  Plus, 
  Download, 
  Calendar, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  AlertCircle, 
  Receipt,
  Building2,
  FileText
} from 'lucide-react';
import FiscalMemoryModal from '../components/cashClose/FiscalMemoryModal';

const formatUSD = (num) => `$${(Number(num) || 0).toFixed(2)}`;

export default function FiscalBooks() {
  const { 
    invoices = [], 
    purchases = [], 
    addPurchase, 
    updatePurchase, 
    deletePurchase,
    voidInvoice,
    restoreInvoice,
    deleteInvoice,
    fiscalSettings,
    fiscalGetFiscalMemory,
    fiscalPrintFiscalMemory,
    exchangeRate = 876.80 
  } = useData() || {};

  const [activeTab, setActiveTab] = useState('ventas'); // 'ventas' | 'compras' | 'resumen'
  
  // Filtros de período
  const now = new Date();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(now.getFullYear());
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedFortnight, setSelectedFortnight] = useState('all'); // 'all' | 'q1' (1-15) | 'q2' (16-fin)
  const [searchQuery, setSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('fiscal_only'); // 'fiscal_only' | 'all'

  // Modales
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showFiscalMemoryModal, setShowFiscalMemoryModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [invoiceToVoidFiscal, setInvoiceToVoidFiscal] = useState(null);
  const [voidReasonFiscal, setVoidReasonFiscal] = useState('');
  const [invoiceToRestoreFiscal, setInvoiceToRestoreFiscal] = useState(null);
  const [invoiceToDeleteFiscal, setInvoiceToDeleteFiscal] = useState(null);
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

  // Cálculo de fechas del período seleccionado
  const filterByPeriod = (dateVal) => {
    if (!dateVal) return false;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return false;
    
    const year = String(d.getFullYear());
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = d.getDate();

    if (year !== selectedYear || month !== selectedMonth) return false;

    if (selectedFortnight === 'q1') return day <= 15;
    if (selectedFortnight === 'q2') return day >= 16;
    return true;
  };

  // 1. Filtrado del Libro de Ventas
  const salesBookData = useMemo(() => {
    let list = (invoices || [])
      .filter(inv => filterByPeriod(inv.date || inv.createdAt));

    if (docTypeFilter === 'fiscal_only') {
      list = list.filter(inv => 
        Boolean(inv.isFiscalInvoice || inv.docType === 'fiscal' || inv.fiscalInvoiceNumber || inv.isFiscal || inv.formatType === 'seniat')
      );
    }

    list = list.sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));

    let opNum = 1;
    return list.map(inv => {
      const invRate = Number(inv.exchangeRate) || exchangeRate || 876.80;
      const isVoided = (inv.status || '').toLowerCase() === 'voided' || (inv.status || '').toLowerCase() === 'anulada';
      const isFiscalDoc = Boolean(inv.isFiscalInvoice || inv.docType === 'fiscal' || inv.fiscalInvoiceNumber || inv.isFiscal);

      // Totales
      const totalUSD = Number(inv.totalUSD || 0);
      const totalBs = Number(inv.totalBs || (totalUSD * invRate));

      // Determinación de Contribuyente
      const ced = (inv.clientCedula || '').trim().toUpperCase();
      const isContribuyente = ced.startsWith('J-') || ced.startsWith('G-') || inv.clientType === 'contribuyente';
      const clientTypeLabel = isContribuyente ? 'Contribuyente' : 'No Contribuyente';

      // Base Imponible y Débito Fiscal
      const baseUSD = Number(inv.baseImponibleUSD || (totalUSD / 1.16));
      const baseBs = isVoided ? 0 : Number((inv.baseImponibleBs || (baseUSD * invRate)).toFixed(2));
      const ivaBs = isVoided ? 0 : Number((inv.ivaBs || (baseBs * 0.16)).toFixed(2));
      const igtfBs = isVoided ? 0 : Number(inv.igtfBs || 0);
      const exemptBs = isVoided ? 0 : (inv.exemptBs ? Number(inv.exemptBs) : 0);

      const d = new Date(inv.date || inv.createdAt || Date.now());
      const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

      const docNumber = inv.fiscalInvoiceNumber || inv.invoiceNumber || String(inv.id).slice(-6);
      const ctrlNumber = inv.fiscalControlNumber || `00-${String(docNumber).padStart(6, '0')}`;

      return {
        op: opNum++,
        id: inv.id,
        rawDate: inv.date || inv.createdAt,
        dateFormatted,
        clientRif: ced || 'V-00000000',
        clientName: inv.clientName || 'Consumidor Final',
        clientType: clientTypeLabel,
        invoiceNumber: String(docNumber),
        controlNumber: ctrlNumber,
        transactionType: isVoided ? '03-ANUL' : '01-REG',
        affectedInvoice: isVoided ? String(docNumber) : '',
        totalBs: isVoided ? 0 : totalBs,
        exemptBs,
        baseBs,
        taxRate: 16,
        ivaBs,
        igtfBs,
        ivaRetainedBs: 0,
        totalUSD: isVoided ? 0 : totalUSD,
        isVoided,
        isFiscalDoc,
        voidReason: inv.voidReason || ''
      };
    });
  }, [invoices, selectedYear, selectedMonth, selectedFortnight, exchangeRate, docTypeFilter]);

  // 2. Filtrado del Libro de Compras
  const purchasesBookData = useMemo(() => {
    const list = (purchases || [])
      .filter(p => filterByPeriod(p.date || p.createdAt))
      .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));

    let opNum = 1;
    return list.map(p => {
      const pRate = Number(p.exchangeRate) || exchangeRate || 876.80;
      const isVoided = p.transactionType === '03-ANUL';

      const totalBs = Number(p.totalAmountBs || 0);
      const exemptBs = Number(p.exemptAmountBs || 0);
      const baseBs = Number(p.taxableBaseBs || 0);
      const ivaBs = Number(p.ivaBs || 0);
      const ivaRetainedBs = Number(p.ivaRetainedBs || 0);
      const igtfBs = Number(p.igtfBs || 0);
      const totalUSD = Number(p.totalAmountUSD || (totalBs / pRate));

      const d = new Date(p.date || p.createdAt || Date.now());
      const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

      return {
        op: opNum++,
        id: p.id,
        rawDate: p.date,
        dateFormatted,
        supplierRif: (p.supplierRif || '').toUpperCase(),
        supplierName: p.supplierName || 'Proveedor',
        invoiceNumber: p.invoiceNumber || 'S/N',
        controlNumber: p.controlNumber || '00-000000',
        transactionType: p.transactionType || '01-REG',
        affectedInvoice: p.affectedInvoice || '',
        totalBs: isVoided ? 0 : totalBs,
        exemptBs: isVoided ? 0 : exemptBs,
        baseBs: isVoided ? 0 : baseBs,
        taxRate: Number(p.taxRate * 100) || 16,
        ivaBs: isVoided ? 0 : ivaBs,
        ivaRetainedBs: isVoided ? 0 : ivaRetainedBs,
        retentionNumber: p.retentionNumber || '',
        igtfBs: isVoided ? 0 : igtfBs,
        totalUSD: isVoided ? 0 : totalUSD,
        category: p.category || 'Varios',
        isVoided
      };
    });
  }, [purchases, selectedYear, selectedMonth, selectedFortnight, exchangeRate]);

  // Totales Ventas
  const salesTotals = useMemo(() => {
    return salesBookData.reduce((acc, row) => {
      if (!row.isVoided) {
        acc.totalBs += row.totalBs;
        acc.exemptBs += row.exemptBs;
        acc.baseBs += row.baseBs;
        acc.ivaBs += row.ivaBs;
        acc.igtfBs += row.igtfBs;
        acc.totalUSD += row.totalUSD;
        acc.count += 1;
      } else {
        acc.voidedCount += 1;
      }
      return acc;
    }, { totalBs: 0, exemptBs: 0, baseBs: 0, ivaBs: 0, igtfBs: 0, totalUSD: 0, count: 0, voidedCount: 0 });
  }, [salesBookData]);

  // Totales Compras
  const purchasesTotals = useMemo(() => {
    return purchasesBookData.reduce((acc, row) => {
      if (!row.isVoided) {
        acc.totalBs += row.totalBs;
        acc.exemptBs += row.exemptBs;
        acc.baseBs += row.baseBs;
        acc.ivaBs += row.ivaBs;
        acc.ivaRetainedBs += row.ivaRetainedBs;
        acc.totalUSD += row.totalUSD;
        acc.count += 1;
      }
      return acc;
    }, { totalBs: 0, exemptBs: 0, baseBs: 0, ivaBs: 0, ivaRetainedBs: 0, totalUSD: 0, count: 0 });
  }, [purchasesBookData]);

  // Resumen Tributario SENIAT (Forma 30)
  const taxSummary = useMemo(() => {
    const debitoFiscal = salesTotals.ivaBs; // IVA en Ventas
    const creditoFiscal = purchasesTotals.ivaBs; // IVA en Compras
    const balanceIVA = debitoFiscal - creditoFiscal; // Positivo: Cuota a pagar; Negativo: Saldo a favor
    const igtfTotal = salesTotals.igtfBs; // IGTF 3% percibido

    return {
      debitoFiscal,
      creditoFiscal,
      balanceIVA,
      isCuotaPagar: balanceIVA > 0,
      montoPagar: balanceIVA > 0 ? balanceIVA : 0,
      saldoAFavor: balanceIVA < 0 ? Math.abs(balanceIVA) : 0,
      igtfTotal,
      totalPagarSeniat: (balanceIVA > 0 ? balanceIVA : 0) + igtfTotal
    };
  }, [salesTotals, purchasesTotals]);

  // Formulario interactivo de compra (Auto-cálculo de Base e IVA al escribir total)
  const handleTotalAmountChange = (val) => {
    const total = parseFloat(val) || 0;
    const exempt = parseFloat(purchaseForm.exemptAmountBs) || 0;
    const taxableTotal = Math.max(0, total - exempt);
    const base = Number((taxableTotal / 1.16).toFixed(2));
    const iva = Number((taxableTotal - base).toFixed(2));

    setPurchaseForm(prev => ({
      ...prev,
      totalAmountBs: val,
      taxableBaseBs: base > 0 ? String(base) : '',
      ivaBs: iva > 0 ? String(iva) : ''
    }));
  };

  const handleSavePurchase = (e) => {
    e.preventDefault();
    if (!purchaseForm.supplierRif || !purchaseForm.supplierName || !purchaseForm.totalAmountBs) {
      showToast('Por favor completa los campos obligatorios (*)', 'error');
      return;
    }

    const totalBs = parseFloat(purchaseForm.totalAmountBs) || 0;
    const exemptBs = parseFloat(purchaseForm.exemptAmountBs) || 0;
    const baseBs = parseFloat(purchaseForm.taxableBaseBs) || (totalBs - exemptBs) / 1.16;
    const ivaBs = parseFloat(purchaseForm.ivaBs) || (baseBs * 0.16);
    const retainedBs = parseFloat(purchaseForm.ivaRetainedBs) || 0;
    const igtfBs = parseFloat(purchaseForm.igtfBs) || 0;
    const totalUSD = totalBs / exchangeRate;

    const payload = {
      date: purchaseForm.date,
      supplierRif: purchaseForm.supplierRif.trim().toUpperCase(),
      supplierName: purchaseForm.supplierName.trim(),
      invoiceNumber: purchaseForm.invoiceNumber.trim() || 'S/N',
      controlNumber: purchaseForm.controlNumber.trim() || '00-000000',
      transactionType: purchaseForm.transactionType,
      affectedInvoice: purchaseForm.affectedInvoice.trim(),
      totalAmountBs: totalBs,
      exemptAmountBs: exemptBs,
      taxableBaseBs: baseBs,
      taxRate: 0.16,
      ivaBs,
      ivaRetainedBs: retainedBs,
      retentionNumber: purchaseForm.retentionNumber.trim(),
      igtfBs,
      exchangeRate,
      totalAmountUSD: totalUSD,
      category: purchaseForm.category,
      notes: purchaseForm.notes.trim()
    };

    if (editingPurchase) {
      updatePurchase(editingPurchase.id, payload);
      showToast('¡Factura de compra actualizada con éxito!');
    } else {
      addPurchase(payload);
      showToast('¡Factura de compra registrada con éxito en el Libro de Compras!');
    }

    setShowPurchaseModal(false);
    setEditingPurchase(null);
  };

  const handleOpenEdit = (p) => {
    setEditingPurchase(p);
    setPurchaseForm({
      date: p.rawDate || p.date,
      supplierRif: p.supplierRif,
      supplierName: p.supplierName,
      invoiceNumber: p.invoiceNumber,
      controlNumber: p.controlNumber,
      transactionType: p.transactionType,
      affectedInvoice: p.affectedInvoice || '',
      totalAmountBs: String(p.totalBs),
      exemptAmountBs: String(p.exemptBs),
      taxableBaseBs: String(p.baseBs),
      taxRate: 0.16,
      ivaBs: String(p.ivaBs),
      ivaRetainedBs: String(p.ivaRetainedBs),
      retentionNumber: p.retentionNumber || '',
      igtfBs: String(p.igtfBs),
      category: p.category || 'Materia Prima / Alimentos',
      notes: p.notes || ''
    });
    setShowPurchaseModal(true);
  };

  const handleDeletePurchase = (id) => {
    if (window.confirm('¿Seguro que deseas eliminar esta factura del Libro de Compras?')) {
      deletePurchase(id);
      showToast('Factura eliminada del libro', 'info');
    }
  };

  // 3. Exportación a Excel / CSV Oficial SENIAT (Formato Limpio Nativo Windows)
  const handleExportCSV = () => {
    const filename = exportSeniatBookToCSV({
      isSales: activeTab === 'ventas',
      selectedMonth,
      selectedYear,
      selectedFortnight,
      salesBookData,
      salesTotals,
      purchasesBookData,
      purchasesTotals
    });
    showToast(`¡Archivo descargado para Excel! (${filename})`);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', color: '#0f172a' }}>
      
      {/* Encabezado Principal */}
      {/* Banner Explicativo de Origen de Datos */}
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px',
        padding: '12px 18px', marginBottom: '20px', display: 'flex', gap: '14px', alignItems: 'flex-start'
      }}>
        <div style={{ background: '#2563eb', color: '#ffffff', borderRadius: '8px', padding: '6px', display: 'flex', marginTop: '2px' }}>
          <FileText size={20} />
        </div>
        <div style={{ fontSize: '0.86rem', color: '#1e3a8a', lineHeight: 1.5 }}>
          <div style={{ fontWeight: '800', marginBottom: '4px', fontSize: '0.92rem' }}>
            ¿De dónde sale la información de los Libros Fiscales?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', marginTop: '6px' }}>
            <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
              <strong style={{ color: '#1d4ed8' }}>📈 Libro de Ventas:</strong>
              <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: '2px' }}>
                Se genera automáticamente de las ventas cobradas a clientes en el <strong>Punto de Venta (POS)</strong>.
              </div>
            </div>
            <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
              <strong style={{ color: '#047857' }}>🛒 Libro de Compras:</strong>
              <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: '2px' }}>
                Se alimenta de las facturas que te entregan tus <strong>proveedores</strong> (alimentos, insumos, servicios) registradas con el botón <em>"+ Registrar Compra"</em> para deducir Crédito Fiscal.
              </div>
            </div>
            <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
              <strong style={{ color: '#b45309' }}>⚖️ Resumen IVA (Forma 30):</strong>
              <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: '2px' }}>
                Calcula: <strong>Débito Fiscal (Ventas) − Crédito Fiscal (Compras)</strong> = Total a pagar al SENIAT o Saldo a Favor.
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '10px' }}>
              <BookOpen size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '800' }}>
                Libros de Compra y Venta (SENIAT)
              </h1>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                {CLIENT_CONFIG.legalName || 'INVERSIONES HAPPY DAYS 1 C.A'} • RIF: {CLIENT_CONFIG.rif || 'J-500195923'} • Cumplimiento Ley del IVA
              </span>
            </div>
          </div>
        </div>

        {/* Acciones Superiores */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 16px', background: '#10b981', color: '#ffffff',
              border: 'none', borderRadius: '10px', fontWeight: '700',
              cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 2px 4px rgba(16,185,129,0.2)'
            }}
            title="Descargar archivo estructurado para Microsoft Excel"
          >
            <Download size={16} /> Exportar a Excel (.csv)
          </button>

          <button
            type="button"
            onClick={() => setShowFiscalMemoryModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 16px', background: '#0284c7', color: '#ffffff',
              border: 'none', borderRadius: '10px', fontWeight: '700',
              cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 2px 4px rgba(2,132,199,0.2)'
            }}
            title="Consultar los Reportes Z de la Memoria Fiscal grabados en el chip de la máquina física por rango de fechas"
          >
            <BookOpen size={16} /> Consultar Memoria Fiscal
          </button>

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
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 16px', background: '#2563eb', color: '#ffffff',
                border: 'none', borderRadius: '10px', fontWeight: '700',
                cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <Plus size={16} /> Registrar Compra
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtro de Período Fiscal */}
      <div style={{
        background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px',
        padding: '14px 20px', marginBottom: '20px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px'
      }}>
        {/* Selector de Pestañas */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '3px', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('ventas')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700',
              border: 'none', cursor: 'pointer',
              background: activeTab === 'ventas' ? '#ffffff' : 'transparent',
              color: activeTab === 'ventas' ? '#1d4ed8' : '#64748b',
              boxShadow: activeTab === 'ventas' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <Receipt size={16} /> Libro de Ventas ({salesBookData.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('compras')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700',
              border: 'none', cursor: 'pointer',
              background: activeTab === 'compras' ? '#ffffff' : 'transparent',
              color: activeTab === 'compras' ? '#1d4ed8' : '#64748b',
              boxShadow: activeTab === 'compras' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <Building2 size={16} /> Libro de Compras ({purchasesBookData.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resumen')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700',
              border: 'none', cursor: 'pointer',
              background: activeTab === 'resumen' ? '#ffffff' : 'transparent',
              color: activeTab === 'resumen' ? '#1d4ed8' : '#64748b',
              boxShadow: activeTab === 'resumen' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <FileSpreadsheet size={16} /> Resumen Tributario (Forma 30)
          </button>
        </div>

        {/* Filtros de Mes / Año / Quincena */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="#64748b" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                fontSize: '0.85rem', fontWeight: '700', background: '#f8fafc', color: '#0f172a'
              }}
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
              style={{
                padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                fontSize: '0.85rem', fontWeight: '700', background: '#f8fafc', color: '#0f172a'
              }}
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          <select
            value={selectedFortnight}
            onChange={(e) => setSelectedFortnight(e.target.value)}
            style={{
              padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
              fontSize: '0.85rem', fontWeight: '700', background: '#f8fafc', color: '#0f172a'
            }}
          >
            <option value="all">Mes Completo</option>
            <option value="q1">1ra Quincena (Días 1 al 15)</option>
            <option value="q2">2da Quincena (Días 16 al Fin)</option>
          </select>
        </div>
      </div>

      {/* Tarjetas Resumen de Totales del Período */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>TOTAL FACTURADO (CON IVA)</span>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            Bs. {formatVE(activeTab === 'ventas' ? salesTotals.totalBs : purchasesTotals.totalBs)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700' }}>
            Equiv. {formatUSD(activeTab === 'ventas' ? salesTotals.totalUSD : purchasesTotals.totalUSD)}
          </span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>BASE IMPONIBLE (G 16%)</span>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#2563eb', marginTop: '4px' }}>
            Bs. {formatVE(activeTab === 'ventas' ? salesTotals.baseBs : purchasesTotals.baseBs)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Alícuota general 16%
          </span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
            {activeTab === 'ventas' ? 'DÉBITO FISCAL (IVA COBRADO)' : 'CRÉDITO FISCAL (IVA DEDUCIBLE)'}
          </span>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: activeTab === 'ventas' ? '#d97706' : '#059669', marginTop: '4px' }}>
            Bs. {formatVE(activeTab === 'ventas' ? salesTotals.ivaBs : purchasesTotals.ivaBs)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            16% s/ Base Imponible
          </span>
        </div>

        {activeTab === 'ventas' ? (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>IGTF PERCIBIDO (3% DIVISAS)</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#7c3aed', marginTop: '4px' }}>
              Bs. {formatVE(salesTotals.igtfBs)}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Enterable al SENIAT
            </span>
          </div>
        ) : (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>IVA RETENIDO A PROVEEDORES</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>
              Bs. {formatVE(purchasesTotals.ivaRetainedBs)}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Retenciones aplicadas
            </span>
          </div>
        )}
      </div>

      {/* TAB 1: TABLA LIBRO DE VENTAS */}
      {activeTab === 'ventas' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
              Registro Cronológico de Ventas e Ingresos
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Filtrar Documentos:</span>
              <select
                value={docTypeFilter}
                onChange={(e) => setDocTypeFilter(e.target.value)}
                style={{
                  padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1',
                  fontSize: '0.8rem', fontWeight: '700', background: '#ffffff', color: '#1e40af'
                }}
              >
                <option value="all">Todas las Ventas (POS)</option>
                <option value="fiscal_only">Solo Facturas Fiscales (SENIAT)</option>
              </select>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                ({salesBookData.length} operaciones)
              </span>
            </div>
          </div>

          {salesBookData.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No hay facturas ni ventas registradas en el período seleccionado ({selectedMonth}/{selectedYear}).
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left', minWidth: '1200px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#334155', borderBottom: '1.5px solid #cbd5e1' }}>
                    <th style={{ padding: '10px 12px' }}>Nº Op.</th>
                    <th style={{ padding: '10px 12px' }}>Fecha</th>
                    <th style={{ padding: '10px 12px' }}>RIF / C.I.</th>
                    <th style={{ padding: '10px 12px' }}>Nombre o Razón Social</th>
                    <th style={{ padding: '10px 12px' }}>Tipo Cliente</th>
                    <th style={{ padding: '10px 12px' }}>Nº Factura</th>
                    <th style={{ padding: '10px 12px' }}>Nº Control</th>
                    <th style={{ padding: '10px 12px' }}>Tipo</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Ventas (Bs.)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Base Imponible (Bs.)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>% Alíc.</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Débito Fiscal (Bs.)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>IGTF 3% (Bs.)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {salesBookData.map(row => (
                    <tr 
                      key={row.id} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        background: row.isVoided ? '#fef2f2' : 'transparent',
                        color: row.isVoided ? '#991b1b' : 'inherit'
                      }}
                    >
                      <td style={{ padding: '9px 12px', fontWeight: '700' }}>{row.op}</td>
                      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{row.dateFormatted}</td>
                      <td style={{ padding: '9px 12px', fontWeight: '600' }}>{row.clientRif}</td>
                      <td style={{ padding: '9px 12px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.clientName}
                        {row.isVoided && row.voidReason && (
                          <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: '600' }}>
                            {row.voidReason}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{
                          fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '700',
                          background: row.clientType === 'Contribuyente' ? '#e0f2fe' : '#f1f5f9',
                          color: row.clientType === 'Contribuyente' ? '#0369a1' : '#475569'
                        }}>
                          {row.clientType}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: '700', color: '#0369a1' }}>{row.invoiceNumber}</td>
                      <td style={{ padding: '9px 12px', color: '#64748b' }}>{row.controlNumber}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{
                          fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '800',
                          background: row.isVoided ? '#fee2e2' : '#f0fdf4',
                          color: row.isVoided ? '#991b1b' : '#166534'
                        }}>
                          {row.transactionType}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: '700' }}>{formatVE(row.totalBs)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#2563eb' }}>{formatVE(row.baseBs)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>16%</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: '700', color: '#d97706' }}>{formatVE(row.ivaBs)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#7c3aed' }}>{formatVE(row.igtfBs)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                          {!row.isVoided ? (
                            <button
                              type="button"
                              onClick={() => {
                                setInvoiceToVoidFiscal(row);
                                setVoidReasonFiscal('Anulada por la impresora fiscal HKA');
                              }}
                              style={{
                                padding: '3px 8px', background: '#fff1f2', border: '1px solid #fecdd3',
                                color: '#e11d48', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer'
                              }}
                              title="Marcar como 03-ANUL con Bs 0,00"
                            >
                              🚫 Anular
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setInvoiceToRestoreFiscal(row)}
                              style={{
                                padding: '3px 8px', background: '#f8fafc', border: '1px solid #cbd5e1',
                                color: '#475569', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer'
                              }}
                              title="Restaurar a factura 01-REG válida"
                            >
                              ↩️ Restaurar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setInvoiceToDeleteFiscal(row)}
                            style={{
                              padding: '3px 6px', background: '#fee2e2', border: '1px solid #fca5a5',
                              color: '#dc2626', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer'
                            }}
                            title="Eliminar permanentemente de Libro SENIAT, Caja y Dashboard"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', fontWeight: '800', borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan={8} style={{ padding: '12px', textAlign: 'right' }}>TOTALES DEL PERÍODO:</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>Bs. {formatVE(salesTotals.totalBs)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#2563eb' }}>Bs. {formatVE(salesTotals.baseBs)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>-</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#d97706' }}>Bs. {formatVE(salesTotals.ivaBs)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#7c3aed' }}>Bs. {formatVE(salesTotals.igtfBs)}</td>
                    <td style={{ padding: '12px' }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TABLA LIBRO DE COMPRAS */}
      {activeTab === 'compras' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
              Registro Cronológico de Compras a Proveedores
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Mostrando {purchasesBookData.length} facturas
            </span>
          </div>

          {purchasesBookData.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <p style={{ margin: '0 0 14px 0' }}>No hay compras registradas en el período seleccionado ({selectedMonth}/{selectedYear}).</p>
              <button
                type="button"
                onClick={() => setShowPurchaseModal(true)}
                style={{ padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                + Registrar Primera Compra
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left', minWidth: '1200px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#334155', borderBottom: '1.5px solid #cbd5e1' }}>
                    <th style={{ padding: '10px 12px' }}>Nº Op.</th>
                    <th style={{ padding: '10px 12px' }}>Fecha</th>
                    <th style={{ padding: '10px 12px' }}>RIF Proveedor</th>
                    <th style={{ padding: '10px 12px' }}>Nombre / Razón Social</th>
                    <th style={{ padding: '10px 12px' }}>Nº Factura</th>
                    <th style={{ padding: '10px 12px' }}>Nº Control</th>
                    <th style={{ padding: '10px 12px' }}>Tipo</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Compra (Bs.)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Base Imponible (Bs.)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>% Alíc.</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Crédito Fiscal (Bs.)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>IVA Retenido (Bs.)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {purchasesBookData.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '9px 12px', fontWeight: '700' }}>{row.op}</td>
                      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{row.dateFormatted}</td>
                      <td style={{ padding: '9px 12px', fontWeight: '700' }}>{row.supplierRif}</td>
                      <td style={{ padding: '9px 12px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.supplierName}
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: '700', color: '#0369a1' }}>{row.invoiceNumber}</td>
                      <td style={{ padding: '9px 12px', color: '#64748b' }}>{row.controlNumber}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', background: '#f0fdf4', color: '#166534' }}>
                          {row.transactionType}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: '700' }}>{formatVE(row.totalBs)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#2563eb' }}>{formatVE(row.baseBs)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>16%</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: '700', color: '#059669' }}>{formatVE(row.ivaBs)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#dc2626' }}>{formatVE(row.ivaRetainedBs)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(row)}
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                            title="Editar compra"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePurchase(row.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                            title="Eliminar compra"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', fontWeight: '800', borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan={7} style={{ padding: '12px', textAlign: 'right' }}>TOTALES DEL PERÍODO:</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>Bs. {formatVE(purchasesTotals.totalBs)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#2563eb' }}>Bs. {formatVE(purchasesTotals.baseBs)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>-</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#059669' }}>Bs. {formatVE(purchasesTotals.ivaBs)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#dc2626' }}>Bs. {formatVE(purchasesTotals.ivaRetainedBs)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RESUMEN TRIBUTARIO AUTOLIQUIDACIÓN (FORMA 30 SENIAT) */}
      {activeTab === 'resumen' && (
        <TaxSummaryForma30 taxSummary={taxSummary} />
      )}

      {/* Modal para Registrar / Editar Compra */}
      {showPurchaseModal && (
        <PurchaseFormModal
          editingPurchase={editingPurchase}
          purchaseForm={purchaseForm}
          setPurchaseForm={setPurchaseForm}
          onTotalAmountChange={handleTotalAmountChange}
          onSavePurchase={handleSavePurchase}
          onClose={() => setShowPurchaseModal(false)}
        />
      )}

      {/* Modal para Anular Factura en Libro Fiscal y Caja */}
      {invoiceToVoidFiscal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2500, backdropFilter: 'blur(4px)', padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', padding: '24px',
            maxWidth: '480px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            border: '1.5px solid #fecaca', color: '#0f172a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ padding: '10px', background: '#fee2e2', borderRadius: '10px', color: '#dc2626' }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#991b1b', fontWeight: '800' }}>
                  Anular Factura #{invoiceToVoidFiscal.invoiceNumber}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {invoiceToVoidFiscal.clientName} ({invoiceToVoidFiscal.clientRif}) • Bs. {formatVE(invoiceToVoidFiscal.totalBs)}
                </span>
              </div>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '0.82rem', color: '#991b1b', lineHeight: '1.4' }}>
              ⚠️ <b>Efecto en Libro de Ventas SENIAT:</b><br/>
              • Pasará a estado <b>03-ANUL</b> con Base Imponible e IVA en <b>Bs 0,00</b>.<br/>
              • Se restará automáticamente del total facturado y cobrado en Caja.<br/>
              • Mantiene correlativo fiscal sin alterar los cierres Z auditados.
            </div>

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Motivo de Anulación:
            </label>
            <textarea
              autoFocus
              value={voidReasonFiscal}
              onChange={(e) => setVoidReasonFiscal(e.target.value)}
              placeholder="Indica la razón (ej: Anulada por impresora fiscal, error en factura, cancelación)..."
              style={{
                width: '100%', boxSizing: 'border-box', minHeight: '75px', padding: '10px',
                borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem',
                color: '#0f172a', marginBottom: '16px', outline: 'none'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setInvoiceToVoidFiscal(null)}
                style={{ padding: '9px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (voidInvoice) {
                    const finalReason = voidReasonFiscal.trim() || 'Anulada por impresora fiscal HKA';
                    voidInvoice(invoiceToVoidFiscal.id, finalReason);
                    showToast(`Factura #${invoiceToVoidFiscal.invoiceNumber} marcada como 03-ANUL (Bs 0,00).`, 'info');
                    setInvoiceToVoidFiscal(null);
                  }
                }}
                style={{ padding: '9px 22px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
              >
                🚫 Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Restaurar Factura en Libro Fiscal */}
      {invoiceToRestoreFiscal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2500, backdropFilter: 'blur(4px)', padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', padding: '24px',
            maxWidth: '440px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            border: '1.5px solid #a7f3d0', color: '#0f172a'
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.15rem', color: '#065f46', fontWeight: '800' }}>
              Restaurar Factura #{invoiceToRestoreFiscal.invoiceNumber}
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '0.85rem', lineHeight: '1.4' }}>
              ¿Deseas restaurar esta factura a estado <strong>01-REG activa</strong>? Volverá a sumar base imponible e IVA en el Libro SENIAT y en Caja.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setInvoiceToRestoreFiscal(null)}
                style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (restoreInvoice) {
                    restoreInvoice(invoiceToRestoreFiscal.id);
                    showToast(`Factura #${invoiceToRestoreFiscal.invoiceNumber} restaurada a 01-REG.`, 'success');
                    setInvoiceToRestoreFiscal(null);
                  }
                }}
                style={{ padding: '8px 20px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
              >
                ↩️ Confirmar Restauración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Eliminar Factura Permanentemente de Libro SENIAT */}
      {invoiceToDeleteFiscal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2600, backdropFilter: 'blur(4px)', padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', padding: '24px',
            maxWidth: '460px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            border: '2px solid #ef4444', color: '#0f172a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ padding: '10px', background: '#fee2e2', borderRadius: '10px', color: '#dc2626' }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#991b1b', fontWeight: '800' }}>
                  ¿Eliminar Factura #{invoiceToDeleteFiscal.invoiceNumber}?
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  {invoiceToDeleteFiscal.clientName} • Bs. {formatVE(invoiceToDeleteFiscal.totalBs)}
                </span>
              </div>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px', marginBottom: '18px', fontSize: '0.82rem', color: '#991b1b', lineHeight: '1.45' }}>
              ⚠️ <b>Eliminación Completa de Todo el Sistema:</b><br/>
              • La factura será borrada definitivamente.<br/>
              • Desaparecerá del Libro de Ventas SENIAT, del Cierre de Caja y del Dashboard.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setInvoiceToDeleteFiscal(null)}
                style={{ padding: '9px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteInvoice) {
                    deleteInvoice(invoiceToDeleteFiscal.id);
                    showToast(`Factura #${invoiceToDeleteFiscal.invoiceNumber} eliminada de todo el sistema.`, 'info');
                    setInvoiceToDeleteFiscal(null);
                  }
                }}
                style={{ padding: '9px 22px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                🗑️ Sí, Eliminar de Todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Consulta de Memoria Fiscal SENIAT */}
      <FiscalMemoryModal
        isOpen={showFiscalMemoryModal}
        onClose={() => setShowFiscalMemoryModal(false)}
        initialDate={`${selectedYear}-${selectedMonth}-01`}
        fiscalSettings={fiscalSettings}
        fiscalGetFiscalMemory={fiscalGetFiscalMemory}
        fiscalPrintFiscalMemory={fiscalPrintFiscalMemory}
        posInvoices={invoices}
        exchangeRate={exchangeRate}
      />

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#dc2626' : '#10b981',
          color: '#ffffff', padding: '10px 22px', borderRadius: '24px',
          fontWeight: '700', fontSize: '0.88rem', zIndex: 3000,
          boxShadow: '0 8px 20px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          {toast.msg}
        </div>
      )}

    </div>
  );
}