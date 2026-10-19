import React, { useState } from 'react';
import { X, Printer, Receipt, FileText } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { CLIENT_CONFIG } from '../config/clientConfig';
import { BankLogo, findBank } from '../utils/venezuelaBanks';

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

// Formato de número oficial a 8 dígitos (ej. 00011898)
export const getFiscalNumber = (invoice) => {
  if (invoice.fiscalInvoiceNumber) return String(invoice.fiscalInvoiceNumber).padStart(8, '0');
  if (invoice.invoiceNumber) {
    const digits = String(invoice.invoiceNumber).replace(/\D/g, '');
    if (digits) return digits.padStart(8, '0').slice(-8);
    return String(invoice.invoiceNumber);
  }
  const idDigits = String(invoice.id || '1').replace(/\D/g, '') || '1';
  return idDigits.padStart(8, '0').slice(-8);
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
  const { clients = [] } = useData() || {};
  
  // Modos disponibles: 'seniat' (Factura Fiscal) | 'nota_entrega' (Nota de Entrega / Cuenta)
  const [formatType, setFormatType] = useState(invoice?.isPreBill ? 'nota_entrega' : 'seniat');
  
  // Tamaño de papel: '58mm' o '80mm' (por defecto 58mm para notas de entrega, 80mm para fiscal)
  const [paperSize, setPaperSize] = useState(invoice?.isPreBill ? '58mm' : '80mm');

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSelectFormat = (type) => {
    setFormatType(type);
    if (type === 'nota_entrega') {
      setPaperSize('58mm');
    } else {
      setPaperSize('80mm');
    }
  };

  // Datos del cliente
  const getClientData = () => {
    if (invoice.client && typeof invoice.client === 'object') {
      return {
        name: invoice.client.name || invoice.clientName || 'Consumidor Final',
        cedula: invoice.client.cedula || invoice.clientCedula || 'V-00000000',
        phone: invoice.client.phone || invoice.clientPhone || (invoice.deliveryInfo?.phone || ''),
        address: invoice.client.address || invoice.clientAddress || (invoice.deliveryInfo?.address || 'EL VALLE')
      };
    }
    const found = clients.find(c => c.id === invoice.clientId);
    return {
      name: invoice.clientName || (found ? found.name : 'Consumidor Final'),
      cedula: invoice.clientCedula || (found ? found.cedula : 'V-00000000'),
      phone: invoice.clientPhone || (found ? found.phone : (invoice.deliveryInfo?.phone || '')),
      address: invoice.clientAddress || (found ? found.address : (invoice.deliveryInfo?.address || 'EL VALLE'))
    };
  };

  const clientInfo = getClientData();
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
            max-width: ${paperSize === '58mm' ? '370px' : '470px'};
            border-radius: 14px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.12); display: flex; flex-direction: column;
            max-height: 94vh; overflow: hidden;
            transition: max-width 0.2s ease;
          }
          .invoice-header-bar {
            display: flex; flex-direction: column; gap: 8px;
            padding: 12px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            background: #1e293b; color: #f8fafc;
          }
          .invoice-content {
            padding: ${paperSize === '58mm' ? '14px 10px' : '20px 18px'};
            overflow-y: auto; background: #ffffff; color: #000000;
          }
          .ticket-paper {
            font-family: 'Courier New', Courier, monospace;
            font-size: ${paperSize === '58mm' ? '10px' : '11.5px'};
            line-height: ${paperSize === '58mm' ? '1.25' : '1.35'};
            color: #000000;
            background: #ffffff;
            margin: 0 auto;
            width: 100%;
          }
          .ticket-center { text-align: center; }
          .ticket-right { text-align: right; }
          .ticket-bold { font-weight: bold; }
          .ticket-divider {
            border-top: 1px dashed #000000;
            margin: 5px 0;
          }
          .ticket-double-divider {
            border-top: 2px dashed #000000;
            margin: 7px 0;
          }
          
          @media print {
            @page {
              size: ${paperSize} auto;
              margin: 0mm;
            }
            html, body {
              width: ${paperSize} !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
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
              width: ${paperSize} !important;
            }
            .invoice-modal {
              box-shadow: none !important;
              border: none !important;
              width: ${paperSize} !important;
              max-width: ${paperSize} !important;
              border-radius: 0 !important;
              background: transparent !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .invoice-header-bar {
              display: none !important;
            }
            .invoice-content, .invoice-content * {
              visibility: visible !important;
            }
            .invoice-content {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: ${paperSize} !important;
              max-width: ${paperSize} !important;
              padding: ${paperSize === '58mm' ? '2mm 1mm' : '4mm 3mm'} !important;
              margin: 0 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
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
                <Receipt size={18} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800' }}>
                  {formatType === 'seniat' ? `Factura Fiscal SENIAT: ${docNumber}` : `Nota de Entrega: #${docNumber}`}
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

            {/* Pestañas de Selección de Formato y Ancho de Papel (58mm / 80mm) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {/* Formato */}
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '2px', gap: '3px' }}>
                <button
                  type="button"
                  onClick={() => handleSelectFormat('seniat')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '5px 10px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: '800',
                    border: 'none', cursor: 'pointer',
                    background: formatType === 'seniat' ? '#38bdf8' : 'transparent',
                    color: formatType === 'seniat' ? '#0f172a' : '#cbd5e1'
                  }}
                >
                  <Receipt size={13} /> SENIAT Fiscal
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectFormat('nota_entrega')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '5px 10px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: '800',
                    border: 'none', cursor: 'pointer',
                    background: formatType === 'nota_entrega' ? '#D52829' : 'transparent',
                    color: '#ffffff'
                  }}
                >
                  <FileText size={13} /> Nota de Entrega
                </button>
              </div>

              {/* Selector de Ancho 58mm / 80mm y Botón Imprimir */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                  <Printer size={14} /> Imprimir ({paperSize})
                </button>
              </div>
            </div>
          </div>

          {/* Ticket Térmico Imprimible */}
          <div className="invoice-content">
            <div className="ticket-paper">
              
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
                            <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#333', paddingLeft: '4px' }}>
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
                  <div style={{ fontSize: paperSize === '58mm' ? '9px' : '10.5px', color: '#222', marginBottom: '6px' }}>
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
                </div>
              )}

              {/* OPCIÓN 2: NOTA DE ENTREGA / CUENTA DE SALÓN / COMANDA UNIFICADA (OPTIMIZADA 58mm / 80mm) */}
              {formatType === 'nota_entrega' && (
                <div>
                  <div className="ticket-center">
                    <div className="ticket-bold" style={{ fontSize: paperSize === '58mm' ? '13px' : '15px', letterSpacing: '0.8px' }}>
                      HAPPY DAYS
                    </div>
                    <div className="ticket-bold" style={{ fontSize: paperSize === '58mm' ? '10px' : '11.5px', marginTop: '1px' }}>
                      RIF: {rif}
                    </div>
                    <div className="ticket-bold" style={{ fontSize: paperSize === '58mm' ? '10px' : '11.5px', marginTop: '1px', textTransform: 'uppercase' }}>
                      {legalName}
                    </div>
                    {addressLines.map((line, idx) => (
                      <div key={idx} style={{ fontSize: paperSize === '58mm' ? '8.5px' : '10.5px', lineHeight: '1.2' }}>
                        {line}
                      </div>
                    ))}
                    <div style={{ fontSize: paperSize === '58mm' ? '9px' : '10.5px', marginTop: '1px' }}>
                      Tel.: {phone}
                    </div>
                    <div style={{ fontSize: paperSize === '58mm' ? '8.5px' : '9.5px', marginTop: '2px', fontWeight: 'bold', color: '#475569' }}>
                      DOCUMENTO DE CONTROL INTERNO (NO FISCAL)
                    </div>
                  </div>

                  <div className="ticket-divider" />

                  {/* Título de Nota de Entrega */}
                  <div className="ticket-center">
                    <div className="ticket-bold" style={{ fontSize: paperSize === '58mm' ? '11px' : '13px', letterSpacing: '0.5px' }}>
                      *** NOTA DE ENTREGA ***
                    </div>
                    <div className="ticket-bold" style={{ fontSize: paperSize === '58mm' ? '10px' : '12px', marginTop: '1px' }}>
                      NOTA DE ENTREGA Nº: {docNumber}
                    </div>
                    <div style={{ fontSize: paperSize === '58mm' ? '9px' : '11px', marginTop: '1px' }}>
                      FECHA: {dateStr}&nbsp;&nbsp;&nbsp;HORA: {timeStr}
                    </div>
                  </div>

                  <div className="ticket-divider" />

                  {/* Mesa, Mesero y Cliente */}
                  <div style={{ fontSize: paperSize === '58mm' ? '9.5px' : '11px', lineHeight: '1.35' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>MESA:</strong> <span className="ticket-bold">{tableName || 'MOSTRADOR'}</span></span>
                      <span><strong>MESERO:</strong> <span className="ticket-bold">{cashierIdentifier}</span></span>
                    </div>

                    {invoice.orderType === 'delivery' && (
                      <div style={{ background: '#f0fdf4', padding: '3px 5px', borderRadius: '4px', margin: '2px 0', border: '1px solid #bbf7d0' }}>
                        <div className="ticket-bold" style={{ color: '#166534', fontSize: '9.5px' }}>🛵 MODALIDAD: DELIVERY</div>
                        {invoice.deliveryInfo?.address && <div><strong>Dir:</strong> {invoice.deliveryInfo.address}</div>}
                        {invoice.deliveryInfo?.phone && <div><strong>Tel:</strong> {invoice.deliveryInfo.phone}</div>}
                      </div>
                    )}

                    {invoice.orderType === 'para_llevar' && (
                      <div className="ticket-bold" style={{ color: '#7c3aed', margin: '2px 0', fontSize: '9.5px' }}>
                        🛍️ MODALIDAD: PARA LLEVAR
                      </div>
                    )}

                    <div><strong>CLIENTE:</strong> {clientInfo.name}</div>
                    <div><strong>C.I/RIF:</strong> {clientInfo.cedula || 'V-00000000'}</div>
                  </div>

                  <div className="ticket-divider" />

                  {/* Cabecera de Ítems */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperSize === '58mm' ? '9px' : '10.5px', fontWeight: 'bold', marginBottom: '3px' }}>
                    <span>CANT  DESCRIPCIÓN</span>
                    <span>TOTAL BS</span>
                  </div>

                  <div style={{ margin: '3px 0' }}>
                    {items.map((item, idx) => {
                      const qty = Number(item.quantity || item.cantidad || 1);
                      const unitPriceUSD = Number(item.unitPrice || item.priceUSD || item.price || 0);
                      const unitPriceBs = Number(item.priceBs || (unitPriceUSD * exchangeRate));
                      const subtotalBs = Number(item.subtotalBs || (qty * unitPriceBs));
                      const noteText = item.note || item.notes;

                      return (
                        <div key={idx} style={{ marginBottom: '5px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperSize === '58mm' ? '9.5px' : '11.5px' }}>
                            <span className="ticket-bold" style={{ textTransform: 'uppercase' }}>
                              [{qty}] {item.productName || item.name || 'PRODUCTO'}
                            </span>
                            <span className="ticket-bold">
                              {formatVE(subtotalBs)}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperSize === '58mm' ? '8.5px' : '10px', color: '#444' }}>
                            <span>{qty} X {formatVE(unitPriceBs)} (${unitPriceUSD.toFixed(2)})</span>
                            <span>Ref. ${(qty * unitPriceUSD).toFixed(2)}</span>
                          </div>

                          {noteText && (
                            <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#b91c1c', paddingLeft: '6px' }}>
                              &gt;&gt; NOTA: {noteText}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {invoice.deliveryFee > 0 && (
                    <div style={{ marginBottom: '5px', fontSize: paperSize === '58mm' ? '9.5px' : '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>[1] FLETE / DELIVERY</span>
                        <span className="ticket-bold">{formatVE(Number(invoice.deliveryFee) * exchangeRate)}</span>
                      </div>
                    </div>
                  )}

                  <div className="ticket-double-divider" />

                  {/* Totales */}
                  <div style={{ fontSize: paperSize === '58mm' ? '9.5px' : '11px', lineHeight: '1.35' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperSize === '58mm' ? '12px' : '14px', margin: '3px 0' }} className="ticket-bold">
                      <span>TOTAL BS:</span>
                      <span>Bs. {formatVE(totalBs)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperSize === '58mm' ? '11px' : '13px', margin: '2px 0' }} className="ticket-bold">
                      <span>TOTAL USD (REF):</span>
                      <span>$ {totalUSD.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: paperSize === '58mm' ? '8.5px' : '10.5px', color: '#333' }}>
                      Tasa Oficial BCV: Bs. {formatVE(exchangeRate, 2)} / USD
                    </div>
                  </div>

                  <div className="ticket-divider" />

                  <div style={{ fontSize: paperSize === '58mm' ? '9.5px' : '11px' }}>
                    <div>
                      <strong>ESTADO:</strong>{' '}
                      <span className="ticket-bold">
                        {isPaid ? 'PAGADO / CANCELADO' : 'PENDIENTE POR COBRAR'}
                      </span>
                    </div>
                    <div><strong>FORMA DE PAGO:</strong> {getPaymentLabel(paymentMethod)}</div>
                  </div>

                  <div className="ticket-divider" style={{ margin: '8px 0 5px 0' }} />
                  <div className="ticket-center" style={{ fontSize: '9px' }}>
                    <div className="ticket-bold">{CLIENT_CONFIG.receipt?.footerGreeting || '¡Gracias por su visita!'}</div>
                    <div style={{ fontSize: '8.5px', marginTop: '1px' }}>{CLIENT_CONFIG.receipt?.contactNotice || 'Instagram: @happydays_ve'}</div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default InvoicePreview;
