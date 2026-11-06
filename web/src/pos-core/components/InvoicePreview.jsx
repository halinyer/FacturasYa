import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Receipt, FileText } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { CLIENT_CONFIG } from '../config/clientConfig';
import { BankLogo, findBank } from '../utils/venezuelaBanks';
import { printIsolatedTicket } from '../utils/printIsolatedTicket';

// Formateador de moneda venezolana (13.200,00)
export const formatVE = (num, decimals = 2) => {
  const val = Number(num) || 0;
  return val.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

// Formato de fecha DD-MM-YYYY
export const getFiscalDate = (dateVal) => {
  const d = dateVal ? new Date(dateVal) : new Date();
  if (isNaN(d.getTime())) return new Date().toLocaleDateString('es-VE');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Formato de hora HH:MM
export const getFiscalTime = (dateVal) => {
  const d = dateVal ? new Date(dateVal) : new Date();
  if (isNaN(d.getTime())) {
    return new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  }
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Formato de número oficial a 8 dígitos (ej. 00011898) o etiqueta limpia en Pre-Cuenta
export const getFiscalNumber = (invoice) => {
  if (!invoice) return '00000001';
  if (invoice.fiscalInvoiceNumber) return String(invoice.fiscalInvoiceNumber).padStart(8, '0');
  if (invoice.isPreBill || String(invoice.invoiceNumber || '').toUpperCase().startsWith('PRE') || String(invoice.invoiceNumber || '').toUpperCase().startsWith('NE-PRE')) {
    return 'PRE-CUENTA';
  }
  if (invoice.invoiceNumber) {
    const digits = String(invoice.invoiceNumber).replace(/\D/g, '');
    if (digits) return digits.padStart(8, '0').slice(-8);
    return String(invoice.invoiceNumber);
  }
  return '00000001';
};

// Etiqueta fiscal de pago
export const getPaymentLabel = (method) => {
  const m = String(method || '').toLowerCase();
  if (m.includes('tarjeta') || m.includes('debito') || m.includes('punto')) return 'TARJETA 1';
  if (m === 'pago_movil') return 'PAGO MÓVIL';
  if (m === 'efectivo_usd') return 'EFECTIVO DIVISAS (USD)';
  if (m === 'efectivo_bs') return 'EFECTIVO BOLÍVARES';
  if (m === 'zelle') return 'TRANSFERENCIA / ZELLE';
  if (m === 'mixto') return 'PAGO MIXTO';
  if (m === 'por cobrar' || m === 'pending') return 'POR COBRAR';
  return (method || 'TARJETA 1').toUpperCase();
};

const InvoicePreview = ({ invoice, onClose }) => {
  const { clients = [], fiscalSettings, fiscalPrintInvoice, updateInvoice } = useData() || {};
  const ticketRef = useRef(null);
  const [isFiscalPrinting, setIsFiscalPrinting] = useState(false);
  const [fiscalToast, setFiscalToast] = useState(null);
  
  // Modos disponibles: 'seniat' (Factura Fiscal) | 'nota_entrega' (Nota de Entrega / Cuenta)
  const isInvoiceOriginallyFiscal = Boolean(invoice?.isFiscalInvoice || invoice?.docType === 'fiscal');
  const [formatType, setFormatType] = useState(() => {
    return isInvoiceOriginallyFiscal ? 'seniat' : 'nota_entrega';
  });
  
  // Tamaño de papel: Por defecto 58mm para adaptarse a la impresora térmica conectada
  const [paperSize, setPaperSize] = useState(() => {
    return localStorage.getItem('pos_comanda_paper_size') || '58mm';
  });
  const is58 = paperSize === '58mm';
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(() => {
    return localStorage.getItem('pos_comanda_printer') || 'POS58 Printer';
  });

  useEffect(() => {
    try {
      localStorage.setItem('pos_comanda_paper_size', paperSize);
    } catch (e) {}
  }, [paperSize]);

  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.getPrinters === 'function') {
      window.electronAPI.getPrinters().then(list => {
        if (Array.isArray(list) && list.length > 0) {
          setPrinters(list);
          const saved = localStorage.getItem('pos_comanda_printer');
          const savedExists = saved && list.some(p => p.name === saved);
          const defaultPos = list.find(p => p.isDefault && /pos|thermal|ticket|58/i.test(p.name)) ||
                             list.find(p => /pos58\s*printer/i.test(p.name)) ||
                             list.find(p => /pos|thermal|ticket|58/i.test(p.name));
          
          if (savedExists) {
            setSelectedPrinter(saved);
          } else if (defaultPos) {
            setSelectedPrinter(defaultPos.name);
            try { localStorage.setItem('pos_comanda_printer', defaultPos.name); } catch(e){}
          }
        }
      }).catch(e => console.warn('Printers load notice:', e));
    }
  }, []);

  if (!invoice) return null;

  const handlePrint = async () => {
    try {
      const html = ticketRef.current ? ticketRef.current.outerHTML : '';
      await printIsolatedTicket({
        html,
        paperSize,
        deviceName: selectedPrinter || 'POS58 Printer',
        silent: true
      });
    } catch (err) {
      console.warn('Error al imprimir ticket:', err);
    }
  };

  // Datos del cliente
  const getClientData = () => {
    const found = clients.find(c => c.id === invoice.clientId);
    if (invoice.client && typeof invoice.client === 'object') {
      return {
        name: invoice.client.name || invoice.clientName || (found ? found.name : 'Consumidor Final'),
        cedula: invoice.client.cedula || invoice.clientCedula || (found ? found.cedula : 'V-00000000'),
        phone: invoice.client.phone || invoice.clientPhone || (found ? found.phone : (invoice.deliveryInfo?.phone || '')),
        address: invoice.client.address || invoice.clientAddress || (found ? found.address : (invoice.deliveryInfo?.address || ''))
      };
    }
    return {
      name: invoice.clientName || (found ? found.name : 'Consumidor Final'),
      cedula: invoice.clientCedula || (found ? found.cedula : 'V-00000000'),
      phone: invoice.clientPhone || (found ? found.phone : (invoice.deliveryInfo?.phone || '')),
      address: invoice.clientAddress || (found ? found.address : (invoice.deliveryInfo?.address || ''))
    };
  };

  const clientInfo = getClientData();

  const handleFiscalPrint = async () => {
    setIsFiscalPrinting(true);
    setFiscalToast({ msg: 'Enviando a impresora fiscal...', type: 'info' });
    try {
      if (fiscalPrintInvoice) {
        const enrichedInvoice = {
          ...invoice,
          clientName: clientInfo.name,
          clientCedula: clientInfo.cedula,
          clientRif: clientInfo.cedula,
          clientPhone: clientInfo.phone,
          clientAddress: clientInfo.address
        };
        const res = await fiscalPrintInvoice(enrichedInvoice);
        if (res && res.success) {
          const officialFiscalNum = res.fiscalInvoiceNumber
            ? String(res.fiscalInvoiceNumber).padStart(8, '0')
            : undefined;
          if (invoice.id && updateInvoice) {
            updateInvoice(invoice.id, {
              isFiscalInvoice: true,
              docType: 'fiscal',
              fiscalInvoiceNumber: officialFiscalNum,
              fiscalControlNumber: officialFiscalNum || invoice.fiscalControlNumber,
              fiscalSerial: res.s1?.registered_machine_number || res.s1?.machine_register || undefined,
              fiscalVerified: true,
              fiscalPrintedAt: new Date().toISOString()
            });
          }
          setFiscalToast({ msg: `¡Factura fiscal ${officialFiscalNum ? 'N° ' + officialFiscalNum : ''} impresa exitosamente!`, type: 'success' });
        } else {
          setFiscalToast({ msg: `Error fiscal: ${res?.error || 'Sin respuesta'}`, type: 'error' });
        }
      }
    } catch (e) {
      setFiscalToast({ msg: `Error: ${e.message}`, type: 'error' });
    } finally {
      setIsFiscalPrinting(false);
      setTimeout(() => setFiscalToast(null), 4000);
    }
  };

  const handleSelectFormat = (type) => {
    setFormatType(type);
    if (type === 'nota_entrega') {
      setPaperSize('58mm');
    } else {
      setPaperSize('58mm'); // Mantener 58mm para no distorsionar en impresoras de 58mm
    }
  };
  const items = invoice.items || [];
  const totalUSD = Number(invoice.totalUSD || invoice.total || 0);
  const exchangeRate = Number(invoice.exchangeRate || invoice.tasaCambio || 876.80);
  const totalBs = Number(invoice.totalBs || (totalUSD * exchangeRate));
  const paymentMethod = invoice.paymentMethod || invoice.metodoPago || 'tarjeta';
  const status = (invoice.status || invoice.estado || 'paid').toLowerCase();
  const isPaid = status === 'paid' || status === 'pagada';

  // Desglose Tributario IVA 16% G
  const baseImponibleBs = Number((totalBs / 1.16).toFixed(2));
  const ivaBs = Number((totalBs - baseImponibleBs).toFixed(2));

  // Número y fechas formateadas
  const docNumber = getFiscalNumber(invoice);
  const dateStr = getFiscalDate(invoice.date || invoice.createdAt);
  const timeStr = getFiscalTime(invoice.date || invoice.createdAt);

  // Datos de la empresa
  const legalName = CLIENT_CONFIG.legalName || 'INVERSIONES HAPPY DAYS 1 C.A';
  const rif = CLIENT_CONFIG.rif || 'J-500195923';
  const phone = CLIENT_CONFIG.phone || '0412-4444929';
  const addressLines = CLIENT_CONFIG.addressLines || [
    'AV FRANCISCO DE MIRANDA FRENTE EL MARQUEZ',
    'C.C UNICENTRO EL MARQUEZ LOCAL NR0126',
    'URB EL MARQUEZ CARACAS PETARE MIRANDA',
    'ZONA POSTAL 1070'
  ];

  // Identificador de mesa, mesero y cajero
  const tableName = invoice.tableName || invoice.mesa || (invoice.client?.name?.includes('Mesa') ? invoice.client.name : null);
  const cashierIdentifier = invoice.waiterName || invoice.cashierName || invoice.serverName || invoice.seller || '001';

  // Datos fiscales de impresora (Memoria de auditoría SENIAT)
  const fiscalMachineCode = CLIENT_CONFIG.fiscalMachine?.type || 'MH';
  const fiscalSerial = CLIENT_CONFIG.fiscalMachine?.serial || 'Z7C7011149';

  return (
    <>
      <style>
        {`
          .invoice-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.82); backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            z-index: 1000; padding: 12px;
          }
          .invoice-modal {
            background: #0f172a; width: 100%;
            max-width: 500px;
            border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.12); display: flex; flex-direction: column;
            max-height: 94vh; overflow: hidden;
            transition: max-width 0.2s ease;
          }
          .invoice-header-bar {
            display: flex; flex-direction: column; gap: 10px;
            padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            background: #1e293b; color: #f8fafc;
          }
          .invoice-content {
            padding: 16px 12px;
            overflow-y: auto; background: #e2e8f0; color: #000000;
            display: flex; justify-content: center; align-items: flex-start;
            flex: 1;
          }
          .invoice-footer-bar {
            display: flex; align-items: center; gap: 10px;
            padding: 12px 16px; background: #1e293b;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }
          .ticket-paper {
            font-family: Arial, Helvetica, sans-serif;
            font-size: ${is58 ? '9.5px' : '10.5px'};
            line-height: 1.25;
            font-weight: 400;
            color: #000000;
            background: #ffffff;
            margin: 0 auto;
            width: 100%;
            max-width: ${is58 ? '230px' : '310px'};
            padding: 12px 10px;
            border-radius: 6px;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }
          .ticket-center { text-align: center; }
          .ticket-right { text-align: right; }
          .ticket-bold { font-weight: 600; }
          .ticket-divider {
            border-top: 1px dashed #000000;
            margin: 3px 0;
          }
          .ticket-double-divider {
            border-top: 1px dashed #000000;
            margin: 4px 0;
          }
          
          @media print {
            @page {
              size: ${is58 ? '58mm auto' : '80mm auto'};
              margin: 0mm !important;
            }
            html, body {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * {
              visibility: hidden !important;
            }
            .invoice-overlay {
              background: transparent !important;
              padding: 0 !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
            }
            .invoice-modal {
              box-shadow: none !important;
              border: none !important;
              width: 100% !important;
              max-width: 100% !important;
              border-radius: 0 !important;
              background: transparent !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .invoice-header-bar, .invoice-footer-bar {
              display: none !important;
            }
            .invoice-content, .invoice-content * {
              visibility: visible !important;
              color: #000000 !important;
              border-color: #000000 !important;
              background-color: transparent !important;
              text-shadow: none !important;
              filter: none !important;
              -webkit-text-stroke: 0 !important;
            }
            .invoice-content {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: ${is58 ? '48mm' : '72mm'} !important;
              padding: 0 !important;
              margin: 0 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .ticket-paper {
              width: 100% !important;
              max-width: ${is58 ? '48mm' : '72mm'} !important;
              margin: 0 !important;
              padding: 0 1mm !important;
            }
          }
        `}
      </style>

      <div className="invoice-overlay" onClick={onClose}>
        <div className="invoice-modal" onClick={e => e.stopPropagation()}>
          
          {/* Header Action Bar con Selector: Factura Fiscal SENIAT | Nota de Entrega */}
          <div className="invoice-header-bar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={18} color={formatType === 'seniat' ? "#10b981" : "#38bdf8"} />
                <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800' }}>
                  {formatType === 'seniat' ? `Factura Fiscal SENIAT: Nº ${docNumber}` : `Nota de Entrega: #${docNumber}`}
                </h3>
              </div>
              <button 
                type="button"
                onClick={onClose}
                style={{ 
                  display: 'flex', alignItems: 'center', padding: '6px',
                  background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Pestañas de Selección de Formato y Controles de Impresión */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {/* Botones de Selección de Modo (Nota de Entrega vs Factura Fiscal) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleSelectFormat('nota_entrega')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '5px 12px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: '800',
                    border: 'none', cursor: 'pointer',
                    background: formatType === 'nota_entrega' ? '#2563eb' : 'rgba(255,255,255,0.08)',
                    color: formatType === 'nota_entrega' ? '#ffffff' : '#94a3b8'
                  }}
                >
                  <FileText size={13} /> NOTA DE ENTREGA (NO FISCAL)
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectFormat('seniat')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '5px 12px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: '800',
                    border: 'none', cursor: 'pointer',
                    background: formatType === 'seniat' ? '#059669' : 'rgba(255,255,255,0.08)',
                    color: formatType === 'seniat' ? '#ffffff' : '#94a3b8'
                  }}
                >
                  <Receipt size={13} /> FACTURA FISCAL SENIAT
                </button>
              </div>

              {/* Controles de Impresión Adaptados Estrictamente al Modo Seleccionado */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {formatType === 'seniat' ? (
                  /* MODO FISCAL SENIAT: Impresora 58mm común DESHABILITADA (por ley SENIAT).
                     Sólo la Impresora Fiscal HKA80 autorizada por SENIAT puede emitir este documento. */
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      color: '#86efac',
                      background: 'rgba(5, 150, 105, 0.2)',
                      border: '1px solid rgba(134, 239, 172, 0.3)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                      HKA80 Fiscal ({fiscalSettings?.port || fiscalSettings?.selectedPort || 'COM2'})
                    </span>

                    <button 
                      type="button"
                      onClick={handleFiscalPrint}
                      disabled={isFiscalPrinting}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        color: '#ffffff', border: 'none', borderRadius: '8px',
                        fontWeight: '800', cursor: isFiscalPrinting ? 'wait' : 'pointer', fontSize: '0.82rem',
                        boxShadow: '0 2px 10px rgba(5, 150, 105, 0.4)'
                      }}
                      title="Emitir ticket en la impresora fiscal The Factory HKA y acumular en memoria para el Cierre Z"
                    >
                      <Printer size={15} /> {isFiscalPrinting ? 'Enviando a HKA...' : `Emitir en Fiscal HKA (${fiscalSettings?.port || fiscalSettings?.selectedPort || 'COM2'})`}
                    </button>
                  </div>
                ) : (
                  /* MODO NOTA DE ENTREGA: Impresora Térmica 58mm / 80mm Convencional */
                  <>
                    {printers.length > 0 && (
                      <select
                        value={selectedPrinter}
                        onChange={(e) => {
                          setSelectedPrinter(e.target.value);
                          try { localStorage.setItem('pos_comanda_printer', e.target.value); } catch(err){}
                        }}
                        style={{
                          padding: '4px 6px', borderRadius: '6px', fontSize: '0.72rem',
                          background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
                          maxWidth: '120px', cursor: 'pointer'
                        }}
                        title="Seleccionar impresora térmica"
                      >
                        {printers.map((p, idx) => (
                          <option key={idx} value={p.name} style={{ background: '#1e293b', color: '#fff' }}>
                            {p.name} {p.isDefault ? '(Predet.)' : ''}
                          </option>
                        ))}
                      </select>
                    )}

                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', padding: '2px' }}>
                      <button
                        type="button"
                        onClick={() => setPaperSize('58mm')}
                        style={{
                          padding: '4px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800',
                          border: 'none', cursor: 'pointer',
                          background: paperSize === '58mm' ? '#e2e8f0' : 'transparent',
                          color: paperSize === '58mm' ? '#0f172a' : '#94a3b8'
                        }}
                      >
                        58mm
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaperSize('80mm')}
                        style={{
                          padding: '4px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800',
                          border: 'none', cursor: 'pointer',
                          background: paperSize === '80mm' ? '#e2e8f0' : 'transparent',
                          color: paperSize === '80mm' ? '#0f172a' : '#94a3b8'
                        }}
                      >
                        80mm
                      </button>
                    </div>

                    <button 
                      type="button"
                      onClick={handlePrint}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px',
                        background: '#22c55e', color: '#0f172a', border: 'none', borderRadius: '8px',
                        fontWeight: '800', cursor: 'pointer', fontSize: '0.78rem'
                      }}
                    >
                      <Printer size={14} /> Imprimir Comprobante ({paperSize})
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Toast de notificación de estado fiscal */}
          {fiscalToast && (
            <div style={{
              padding: '8px 14px',
              fontSize: '0.8rem',
              fontWeight: '700',
              color: '#ffffff',
              background: fiscalToast.type === 'success' ? '#059669' : fiscalToast.type === 'error' ? '#dc2626' : '#0284c7',
              textAlign: 'center'
            }}>
              {fiscalToast.msg}
            </div>
          )}

          {/* Ticket Térmico Imprimible */}
          <div className="invoice-content">
            <div className="ticket-paper" ref={ticketRef}>
              
              {/* OPCIÓN 1: FORMATO FISCAL OFICIAL SENIAT (COPIA FIEL DE FACTURA REAL HAPPY DAYS) */}
              {formatType === 'seniat' && (
                <div>
                  <div className="ticket-center">
                    <div className="ticket-bold" style={{ fontSize: paperSize === '58mm' ? '12px' : '14px', letterSpacing: '1px' }}>
                      SENIAT
                    </div>
                    <div className="ticket-bold" style={{ fontSize: paperSize === '58mm' ? '11px' : '12px', marginTop: '1px' }}>
                      {rif}
                    </div>
                    <div className="ticket-bold" style={{ fontSize: paperSize === '58mm' ? '10.5px' : '12px', marginTop: '1px', textTransform: 'uppercase' }}>
                      {legalName}
                    </div>
                    {addressLines.map((line, idx) => (
                      <div key={idx} style={{ fontSize: paperSize === '58mm' ? '9px' : '10.5px', lineHeight: '1.25' }}>
                        {line}
                      </div>
                    ))}
                    <div style={{ fontSize: paperSize === '58mm' ? '9.5px' : '10.5px', marginTop: '1px' }}>
                      Tel.: {phone}
                    </div>
                  </div>

                  <div className="ticket-divider" />

                  {/* Bloque Cliente Fiscal */}
                  <div style={{ fontSize: paperSize === '58mm' ? '9.5px' : '11px', lineHeight: '1.35' }}>
                    <div><strong>Cliente:</strong> {clientInfo.name}</div>
                    <div><strong>Rif/Ced:</strong> {clientInfo.cedula || 'V-00000000'}</div>
                    {clientInfo.address && <div><strong>Dir.:</strong> {clientInfo.address}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>Tel.:</strong> {clientInfo.phone || phone}</span>
                      <span><strong>Cajero:</strong> {cashierIdentifier}</span>
                    </div>
                  </div>

                  <div className="ticket-divider" />

                  {/* Título Fiscal FACTURA */}
                  <div className="ticket-center">
                    <div className="ticket-bold" style={{ fontSize: paperSize === '58mm' ? '11.5px' : '13px', letterSpacing: '1px' }}>
                      FACTURA
                    </div>
                    <div className="ticket-bold" style={{ fontSize: paperSize === '58mm' ? '11px' : '12px', marginTop: '1px' }}>
                      FACTURA: {docNumber}
                    </div>
                    <div style={{ fontSize: paperSize === '58mm' ? '9.5px' : '11px', marginTop: '1px' }}>
                      FECHA: {dateStr}&nbsp;&nbsp;&nbsp;HORA: {timeStr}
                    </div>
                    {tableName && (
                      <div className="ticket-bold" style={{ fontSize: paperSize === '58mm' ? '9.5px' : '11px', marginTop: '1px' }}>
                        MESA: {tableName} {invoice.waiterName ? `(Mesero: ${invoice.waiterName})` : ''}
                      </div>
                    )}
                  </div>

                  <div className="ticket-divider" />

                  {/* Listado de Productos Fiscales */}
                  <div style={{ margin: '4px 0' }}>
                    {items.map((item, idx) => {
                      const qty = Number(item.quantity || item.cantidad || 1);
                      const unitPriceUSD = Number(item.unitPrice || item.priceUSD || item.price || 0);
                      const unitPriceBs = Number(item.priceBs || (unitPriceUSD * exchangeRate));
                      const subtotalBs = Number(item.subtotalBs || (qty * unitPriceBs));
                      const qtyFormatted = Number(qty).toLocaleString('de-DE', {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3
                      });

                      return (
                        <div key={idx} style={{ marginBottom: '5px' }}>
                          <div className="ticket-bold" style={{ textTransform: 'uppercase', fontSize: paperSize === '58mm' ? '10px' : '11.5px' }}>
                            {item.productName || item.name || 'PRODUCTO'}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperSize === '58mm' ? '9.5px' : '11px' }}>
                            <span>{qtyFormatted} X {formatVE(unitPriceBs)}</span>
                            <span className="ticket-bold">{formatVE(subtotalBs)} (G)</span>
                          </div>
                          {(item.note || item.notes) && (
                            <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#000000', paddingLeft: '4px' }}>
                              * {item.note || item.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Flete o Delivery si aplica */}
                  {invoice.deliveryFee > 0 && (
                    <div style={{ marginBottom: '5px' }}>
                      <div className="ticket-bold" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                        SERVICIO DE FLETE / ENVÍO
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperSize === '58mm' ? '9.5px' : '11px' }}>
                        <span>1,000 X {formatVE(Number(invoice.deliveryFee) * exchangeRate)}</span>
                        <span className="ticket-bold">{formatVE(Number(invoice.deliveryFee) * exchangeRate)} (G)</span>
                      </div>
                    </div>
                  )}

                  {/* Desglose Fiscal SENIAT */}
                  <div className="ticket-divider" />
                  <div style={{ fontSize: paperSize === '58mm' ? '9.5px' : '11px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>BI G16,00%&nbsp;{formatVE(baseImponibleBs)}</span>
                    <span>IVA G16,00%&nbsp;{formatVE(ivaBs)}</span>
                  </div>
                  <div className="ticket-divider" />

                  {/* Total Bs y Referencia */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperSize === '58mm' ? '12px' : '14px', margin: '3px 0' }} className="ticket-bold">
                    <span>TOTAL</span>
                    <span>{formatVE(totalBs)}</span>
                  </div>
                  <div style={{ fontSize: paperSize === '58mm' ? '9px' : '10.5px', color: '#000000', marginBottom: '6px' }}>
                    (Ref. ${totalUSD.toFixed(2)} - Tasa BCV: Bs. {formatVE(exchangeRate, 2)})
                  </div>

                  {/* Forma de Pago */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperSize === '58mm' ? '10px' : '11.5px', margin: '3px 0' }} className="ticket-bold">
                    <span>{getPaymentLabel(paymentMethod)}</span>
                    <span>{formatVE(totalBs)}</span>
                  </div>

                  {/* Pie Fiscal: Memoria y Serial de Máquina Fiscal */}
                  <div style={{ borderTop: '1px dashed #000', margin: '10px 0 5px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperSize === '58mm' ? '10px' : '12px', letterSpacing: '1px' }} className="ticket-bold">
                    <span>{fiscalMachineCode}</span>
                    <span>{fiscalSerial}</span>
                  </div>

                  <div className="ticket-center" style={{ fontSize: '9px', marginTop: '8px' }}>
                    <div className="ticket-bold">{CLIENT_CONFIG.receipt?.footerGreeting || '¡Gracias por su compra!'}</div>
                    <div style={{ fontSize: '8.5px', marginTop: '1px' }}>{CLIENT_CONFIG.receipt?.contactNotice || 'Instagram: @happydays_ve'}</div>
                  </div>

                  {/* Guía de corte y avance para pasar la cuchilla (12mm) */}
                  <div style={{ textAlign: 'center', fontSize: '8px', letterSpacing: '2px', color: '#000', margin: '2px 0' }}>
                    - - - - - - - - - - - - - -
                  </div>
                  <div style={{ height: '12mm', minHeight: '12mm', display: 'block', lineHeight: '12px' }}>
                    &nbsp;<br/>&nbsp;
                  </div>
                </div>
              )}

              {/* OPCIÓN 2: NOTA DE ENTREGA / CUENTA DE SALÓN (OPTIMIZADA 58mm / 80mm) */}
              {formatType === 'nota_entrega' && (
                <div>
                  {/* Encabezado Compacto */}
                  <div className="ticket-center">
                    <div className="ticket-bold" style={{ fontSize: is58 ? '12px' : '14px', letterSpacing: '0.5px' }}>
                      HAPPY DAYS
                    </div>
                    <div style={{ fontSize: is58 ? '8.5px' : '9.5px', marginTop: '1px' }}>
                      Tel: {phone}
                    </div>
                    <div style={{ fontSize: is58 ? '8px' : '9px' }}>
                      C.C. Unicentro El Marqués • Caracas
                    </div>
                    <div className="ticket-bold" style={{ fontSize: is58 ? '10px' : '11px', marginTop: '2px', letterSpacing: '0.5px' }}>
                      *** NOTA DE ENTREGA ***
                    </div>
                    <div style={{ fontSize: is58 ? '7.5px' : '8px', marginTop: '1px', color: '#555' }}>
                      (DOCUMENTO NO FISCAL - CONTROL INTERNO)
                    </div>
                  </div>

                  <div className="ticket-divider" />

                  {/* Metadatos de la Orden */}
                  <div style={{ fontSize: is58 ? '8.5px' : '9.5px', lineHeight: '1.25' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Nota Nº: #{docNumber}</span>
                      <span>Hora: {timeStr}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Fecha: {dateStr}</span>
                      <span>Mesa: <span className="ticket-bold">{tableName || 'MOSTRADOR'}</span></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Mesero: {cashierIdentifier}</span>
                    </div>

                    {invoice.orderType === 'delivery' && (
                      <div style={{ margin: '2px 0', borderTop: '1px dotted #000', paddingTop: '2px' }}>
                        <div className="ticket-bold" style={{ fontSize: '8.5px' }}>🛵 MODALIDAD: DELIVERY</div>
                        {invoice.deliveryInfo?.address && <div>Dir: {invoice.deliveryInfo.address}</div>}
                        {invoice.deliveryInfo?.phone && <div>Tel: {invoice.deliveryInfo.phone}</div>}
                      </div>
                    )}

                    {invoice.orderType === 'para_llevar' && (
                      <div className="ticket-bold" style={{ margin: '2px 0', fontSize: '8.5px' }}>
                        🛍️ MODALIDAD: PARA LLEVAR
                      </div>
                    )}

                    <div style={{ borderTop: '1px dotted #ccc', marginTop: '2px', paddingTop: '2px' }}>
                      <div>Cliente: {clientInfo.name}</div>
                      {clientInfo.cedula && clientInfo.cedula !== 'V-00000000' && (
                        <div>C.I: {clientInfo.cedula}</div>
                      )}
                    </div>
                  </div>

                  <div className="ticket-divider" />

                  {/* Cabecera de Ítems */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: is58 ? '8px' : '9px', fontWeight: '600', marginBottom: '2px', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '1px' }}>
                    <span>CANT  DESCRIPCIÓN</span>
                    <span>TOTAL BS</span>
                  </div>

                  <div style={{ margin: '2px 0' }}>
                    {items.map((item, idx) => {
                      const qty = Number(item.quantity || item.cantidad || 1);
                      const unitPriceUSD = Number(item.unitPrice || item.priceUSD || item.price || 0);
                      const unitPriceBs = Number(item.priceBs || (unitPriceUSD * exchangeRate));
                      const subtotalBs = Number(item.subtotalBs || (qty * unitPriceBs));
                      const noteText = item.note || item.notes;

                      return (
                        <div key={idx} style={{ marginBottom: '3px', paddingBottom: '2px', borderBottom: idx < items.length - 1 ? '1px dotted #e2e8f0' : 'none' }}>
                          {/* Fila 1: Cantidad y Nombre con wrap fluido */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3px' }}>
                            <span className="ticket-bold" style={{ fontSize: is58 ? '9.5px' : '10.5px', minWidth: '16px' }}>
                              {qty}x
                            </span>
                            <span style={{ 
                              fontSize: is58 ? '9px' : '10px', 
                              fontWeight: '500',
                              flex: 1, 
                              wordBreak: 'break-word', 
                              textTransform: 'uppercase',
                              lineHeight: '1.2'
                            }}>
                              {item.productName || item.name || 'PRODUCTO'}
                            </span>
                          </div>

                          {/* Fila 2: Precio unitario y Subtotal alineado a la derecha */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'baseline', 
                            fontSize: is58 ? '8px' : '9px', 
                            marginTop: '1px',
                            paddingLeft: '16px'
                          }}>
                            <span style={{ color: '#444' }}>
                              ${unitPriceUSD.toFixed(2)} c/u
                            </span>
                            <span className="ticket-bold" style={{ fontSize: is58 ? '9px' : '10px', whiteSpace: 'nowrap' }}>
                              Bs. {formatVE(subtotalBs)}
                              <span style={{ fontSize: '7.5px', fontWeight: 'normal', color: '#555', marginLeft: '3px' }}>
                                (${(qty * unitPriceUSD).toFixed(2)})
                              </span>
                            </span>
                          </div>

                          {/* Nota de producto si existe */}
                          {noteText && (
                            <div style={{ 
                              fontSize: is58 ? '7.5px' : '8.5px', 
                              fontStyle: 'italic', 
                              marginTop: '1px', 
                              paddingLeft: '16px',
                              color: '#333' 
                            }}>
                              * {noteText}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {invoice.deliveryFee > 0 && (
                    <div style={{ marginBottom: '3px', fontSize: is58 ? '8.5px' : '9.5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>[1] FLETE / DELIVERY</span>
                        <span className="ticket-bold">Bs. {formatVE(Number(invoice.deliveryFee) * exchangeRate)}</span>
                      </div>
                      <div style={{ fontSize: '7.5px', paddingLeft: '16px', color: '#555' }}>
                        Ref. ${Number(invoice.deliveryFee).toFixed(2)}
                      </div>
                    </div>
                  )}

                  <div className="ticket-double-divider" />

                  {/* Totales */}
                  <div style={{ fontSize: is58 ? '8.5px' : '9.5px', lineHeight: '1.3' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: is58 ? '10.5px' : '12px', margin: '2px 0' }} className="ticket-bold">
                      <span>TOTAL BS:</span>
                      <span style={{ whiteSpace: 'nowrap' }}>Bs. {formatVE(totalBs)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: is58 ? '10px' : '11px', margin: '2px 0' }} className="ticket-bold">
                      <span>TOTAL USD (REF):</span>
                      <span style={{ whiteSpace: 'nowrap' }}>$ {totalUSD.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Avance mínimo para pasar la cuchilla de corte */}
                  <div style={{ height: '10mm', minHeight: '10mm', display: 'block' }}>
                    &nbsp;
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Barra inferior fija con botón grande de Impresión */}
          <div className="invoice-footer-bar">
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '11px 16px', background: 'rgba(255,255,255,0.1)', color: '#cbd5e1',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px',
                fontWeight: '700', fontSize: '0.86rem', cursor: 'pointer'
              }}
            >
              Cerrar
            </button>

            {formatType === 'seniat' ? (
              <button
                type="button"
                onClick={handleFiscalPrint}
                disabled={isFiscalPrinting}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '12px 18px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff', border: 'none', borderRadius: '10px',
                  fontWeight: '900', fontSize: '0.9rem', cursor: isFiscalPrinting ? 'wait' : 'pointer',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.4)'
                }}
              >
                <Printer size={18} />
                {isFiscalPrinting ? 'ENVIANDO A IMPRESORA FISCAL...' : `EMITIR EN IMPRESORA FISCAL HKA (${fiscalSettings?.port || fiscalSettings?.selectedPort || 'COM2'})`}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '12px 18px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#ffffff', border: 'none', borderRadius: '10px',
                  fontWeight: '900', fontSize: '0.92rem', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)'
                }}
              >
                <Printer size={18} />
                IMPRIMIR COMPROBANTE ({paperSize.toUpperCase()})
              </button>
            )}
          </div>

        </div>
      </div>

      {fiscalToast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: fiscalToast.type === 'success' ? '#10b981' : fiscalToast.type === 'error' ? '#dc2626' : '#0284c7',
          color: '#fff', padding: '10px 20px', borderRadius: '24px',
          fontWeight: '700', fontSize: '0.85rem', zIndex: 3000,
          boxShadow: '0 8px 20px rgba(0,0,0,0.25)'
        }}>
          {fiscalToast.msg}
        </div>
      )}
    </>
  );
};

export default InvoicePreview;
