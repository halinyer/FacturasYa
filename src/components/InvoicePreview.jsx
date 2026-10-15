import React, { useState } from 'react';
import { X, Printer, Receipt, Utensils, FileText } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { CLIENT_CONFIG } from '../config/clientConfig';
import { BankLogo, findBank } from '../utils/venezuelaBanks';

// Formateador de moneda en Bolívares con formato venezolano (13.200,00)
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

// Formato de número de orden / pre-orden a 8 dígitos (ej. 00011898)
export const getOrderNumber = (invoice) => {
  if (invoice.fiscalInvoiceNumber) return String(invoice.fiscalInvoiceNumber).padStart(8, '0');
  if (invoice.invoiceNumber) {
    const digits = String(invoice.invoiceNumber).replace(/\D/g, '');
    if (digits) return digits.padStart(8, '0').slice(-8);
    return String(invoice.invoiceNumber);
  }
  const idDigits = String(invoice.id || '1').replace(/\D/g, '') || '1';
  return idDigits.padStart(8, '0').slice(-8);
};

// Etiqueta de método de pago
export const getPaymentLabel = (method) => {
  const m = String(method || '').toLowerCase();
  if (m.includes('tarjeta') || m.includes('debito') || m.includes('punto')) return 'TARJETA';
  if (m === 'pago_movil') return 'PAGO MÓVIL';
  if (m === 'efectivo_usd') return 'EFECTIVO DIVISAS (USD)';
  if (m === 'efectivo_bs') return 'EFECTIVO BOLÍVARES';
  if (m === 'zelle') return 'ZELLE / TRANSFERENCIA';
  if (m === 'mixto') return 'PAGO MIXTO';
  if (m === 'por cobrar' || m === 'pending') return 'POR COBRAR (PRE-ORDEN)';
  return (method || 'POR COBRAR').toUpperCase();
};

const InvoicePreview = ({ invoice, onClose }) => {
  const { clients = [] } = useData() || {};
  // Modo de visualización / impresión: 'preorden' (cuenta completa) o 'comanda' (ticket de cocina/barra)
  const [ticketMode, setTicketMode] = useState('preorden');

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  // Resuelve los datos del cliente
  const getClientData = () => {
    if (invoice.client && typeof invoice.client === 'object') {
      return {
        name: invoice.client.name || invoice.clientName || 'Consumidor Final',
        cedula: invoice.client.cedula || invoice.clientCedula || 'V-00000000',
        phone: invoice.client.phone || invoice.clientPhone || (invoice.deliveryInfo?.phone || ''),
        address: invoice.client.address || invoice.clientAddress || (invoice.deliveryInfo?.address || 'CARACAS')
      };
    }
    const found = clients.find(c => c.id === invoice.clientId);
    return {
      name: invoice.clientName || (found ? found.name : 'Consumidor Final'),
      cedula: invoice.clientCedula || (found ? found.cedula : 'V-00000000'),
      phone: invoice.clientPhone || (found ? found.phone : (invoice.deliveryInfo?.phone || '')),
      address: invoice.clientAddress || (found ? found.address : (invoice.deliveryInfo?.address || 'CARACAS'))
    };
  };

  const clientInfo = getClientData();
  const items = invoice.items || [];
  const totalUSD = Number(invoice.totalUSD || invoice.total || 0);
  const exchangeRate = Number(invoice.exchangeRate || invoice.tasaCambio || 876.80);
  const totalBs = Number(invoice.totalBs || (totalUSD * exchangeRate));
  const paymentMethod = invoice.paymentMethod || invoice.metodoPago || 'por cobrar';
  const status = (invoice.status || invoice.estado || 'pending').toLowerCase();
  const isPaid = status === 'paid' || status === 'pagada';

  // Cálculos de IVA y base de forma transparente
  const baseImponibleBs = Number((totalBs / 1.16).toFixed(2));
  const ivaBs = Number((totalBs - baseImponibleBs).toFixed(2));

  // Número y fechas formateadas
  const orderNum = getOrderNumber(invoice);
  const orderDate = getFiscalDate(invoice.date || invoice.createdAt);
  const orderTime = getFiscalTime(invoice.date || invoice.createdAt);

  // Datos del restaurante / empresa
  const headerTop = CLIENT_CONFIG.receipt?.headerTop || CLIENT_CONFIG.branding?.logoText || 'HAPPY DAYS';
  const legalName = CLIENT_CONFIG.legalName || 'INVERSIONES HAPPY DAYS 1 C.A';
  const rif = CLIENT_CONFIG.rif || 'J-500195923';
  const phone = CLIENT_CONFIG.phone || '0412-4444929';
  const addressLines = CLIENT_CONFIG.addressLines || [
    'AV FRANCISCO DE MIRANDA FRENTE EL MARQUEZ',
    'C.C UNICENTRO EL MARQUEZ LOCAL NR0126',
    'URB EL MARQUEZ CARACAS PETARE MIRANDA',
    'ZONA POSTAL 1070'
  ];

  // Identificador de mesa y mesero/cajero
  const tableName = invoice.tableName || invoice.mesa || (invoice.client?.name?.includes('Mesa') ? invoice.client.name : null);
  const waiterName = invoice.waiterName || invoice.mesero || invoice.cashierName || invoice.serverName || '001';

  // Conteo total de ítems/platos (útil para comandas de cocina)
  const totalItemsCount = items.reduce((sum, item) => sum + Number(item.quantity || item.cantidad || 1), 0);

  return (
    <>
      <style>
        {`
          .invoice-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.82); backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            z-index: 1000; padding: 16px;
          }
          .invoice-modal {
            background: #0f172a; width: 100%; max-width: 460px;
            border-radius: 14px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.12); display: flex; flex-direction: column;
            max-height: 94vh; overflow: hidden;
          }
          .invoice-header-bar {
            display: flex; flex-direction: column; gap: 8px;
            padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            background: #1e293b; color: #f8fafc;
          }
          .invoice-content {
            padding: 20px 18px; overflow-y: auto; background: #ffffff; color: #000000;
          }
          .ticket-paper {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11.5px;
            line-height: 1.35;
            color: #000000;
            background: #ffffff;
            margin: 0 auto;
          }
          .ticket-center { text-align: center; }
          .ticket-right { text-align: right; }
          .ticket-bold { font-weight: bold; }
          .ticket-divider {
            border-top: 1px dashed #000000;
            margin: 6px 0;
          }
          .ticket-double-divider {
            border-top: 2px dashed #000000;
            margin: 8px 0;
          }
          
          @media print {
            @page {
              size: 80mm auto;
              margin: 0mm;
            }
            html, body {
              width: 80mm !important;
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
              width: 80mm !important;
            }
            .invoice-modal {
              box-shadow: none !important;
              border: none !important;
              width: 80mm !important;
              max-width: 80mm !important;
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
              width: 80mm !important;
              max-width: 80mm !important;
              padding: 4mm 3mm !important;
              margin: 0 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}
      </style>

      <div className="invoice-overlay" onClick={onClose}>
        <div className="invoice-modal" onClick={e => e.stopPropagation()}>
          
          {/* Header Action Bar con Selector de Modo Pre-Orden / Comanda */}
          <div className="invoice-header-bar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={18} color="#D52829" />
                <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '800', color: '#f8fafc' }}>
                  {ticketMode === 'comanda' ? '🍳 Comanda de Cocina' : `📄 Pre-Orden: #${orderNum}`}
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

            {/* Selector de Modo y Botón Imprimir */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '3px', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setTicketMode('preorden')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700',
                    border: 'none', cursor: 'pointer',
                    background: ticketMode === 'preorden' ? '#D52829' : 'transparent',
                    color: ticketMode === 'preorden' ? '#ffffff' : '#94a3b8'
                  }}
                >
                  <FileText size={14} /> Pre-Orden (Cuenta)
                </button>
                <button
                  type="button"
                  onClick={() => setTicketMode('comanda')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700',
                    border: 'none', cursor: 'pointer',
                    background: ticketMode === 'comanda' ? '#D52829' : 'transparent',
                    color: ticketMode === 'comanda' ? '#ffffff' : '#94a3b8'
                  }}
                >
                  <Utensils size={14} /> Comanda (Cocina)
                </button>
              </div>

              <button 
                type="button"
                onClick={handlePrint}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                  background: '#22c55e', color: '#0f172a', border: 'none', borderRadius: '8px',
                  fontWeight: '800', cursor: 'pointer', fontSize: '0.82rem'
                }}
              >
                <Printer size={15} /> Imprimir (80mm)
              </button>
            </div>
          </div>

          {/* Ticket Térmico Imprimible */}
          <div className="invoice-content">
            <div className="ticket-paper">
              
              {/* VISTA 1: MODO COMANDA DE COCINA / BARRA */}
              {ticketMode === 'comanda' ? (
                <div>
                  <div className="ticket-center">
                    <div className="ticket-bold" style={{ fontSize: '16px', letterSpacing: '1px' }}>
                      *** COMANDA DE COCINA ***
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>
                      {headerTop} - SERVICIO RÁPIDO
                    </div>
                  </div>

                  <div className="ticket-double-divider" />

                  {/* Banner Destacado de Mesa y Orden */}
                  <div style={{ background: '#f1f5f9', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="ticket-bold" style={{ fontSize: '14px', color: '#0f172a' }}>
                        {tableName ? `MESA: ${tableName}` : (invoice.orderType === 'delivery' ? '🛵 DELIVERY' : '🛍️ PARA LLEVAR')}
                      </span>
                      <span className="ticket-bold" style={{ fontSize: '12px' }}>
                        ORDEN: #{orderNum}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '3px' }}>
                      <span><strong>Mesero:</strong> {waiterName}</span>
                      <span><strong>Hora:</strong> {orderTime}</span>
                    </div>
                    <div style={{ fontSize: '10.5px', marginTop: '2px' }}>
                      <strong>Fecha:</strong> {orderDate}
                    </div>
                  </div>

                  {/* Notas de Envío / Retiro si aplican */}
                  {invoice.deliveryInfo?.address && (
                    <div style={{ fontSize: '10.5px', margin: '4px 0', padding: '4px', background: '#fff', border: '1px dashed #94a3b8' }}>
                      <div><strong>Cliente:</strong> {clientInfo.name}</div>
                      <div><strong>Dir:</strong> {invoice.deliveryInfo.address}</div>
                      {invoice.deliveryInfo.phone && <div><strong>Tel:</strong> {invoice.deliveryInfo.phone}</div>}
                    </div>
                  )}

                  <div className="ticket-divider" />

                  {/* Lista de Platos y Comandas de Cocina */}
                  <div style={{ margin: '8px 0' }}>
                    {items.map((item, idx) => {
                      const qty = Number(item.quantity || item.cantidad || 1);
                      const noteText = item.note || item.notes;

                      return (
                        <div key={idx} style={{ marginBottom: '8px', paddingBottom: '4px', borderBottom: idx < items.length - 1 ? '1px dotted #ccc' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span className="ticket-bold" style={{ fontSize: '14px', minWidth: '34px', background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px', textAlign: 'center' }}>
                              [{qty}]
                            </span>
                            <span className="ticket-bold" style={{ fontSize: '13px', textTransform: 'uppercase' }}>
                              {item.productName || item.name || 'PRODUCTO'}
                            </span>
                          </div>

                          {/* Notas de Cocina Destacadas */}
                          {noteText && (
                            <div style={{ paddingLeft: '40px', marginTop: '2px', fontSize: '11.5px', fontWeight: 'bold', color: '#b91c1c' }}>
                              &gt;&gt; NOTA: {noteText}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="ticket-double-divider" />

                  {/* Resumen Final de Comanda */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }} className="ticket-bold">
                    <span>TOTAL ARTÍCULOS:</span>
                    <span>{totalItemsCount}</span>
                  </div>

                  <div className="ticket-center" style={{ fontSize: '10px', marginTop: '14px' }}>
                    <div className="ticket-bold">¡DESPACHAR CON EXCELENCIA Y SABOR!</div>
                    <div>{headerTop}</div>
                  </div>
                </div>

              ) : (

                /* VISTA 2: MODO PRE-ORDEN / CUENTA DE CONSUMO COMPLETA */
                <div>
                  
                  {/* Encabezado del Restaurante (Sin SENIAT, con datos reales de la empresa) */}
                  <div className="ticket-center">
                    <div className="ticket-bold" style={{ fontSize: '15px', letterSpacing: '0.8px' }}>
                      {headerTop}
                    </div>
                    <div className="ticket-bold" style={{ fontSize: '11.5px', marginTop: '1px' }}>
                      RIF: {rif}
                    </div>
                    <div className="ticket-bold" style={{ fontSize: '11.5px', marginTop: '1px', textTransform: 'uppercase' }}>
                      {legalName}
                    </div>
                    {addressLines.map((line, idx) => (
                      <div key={idx} style={{ fontSize: '10.5px', lineHeight: '1.25' }}>
                        {line}
                      </div>
                    ))}
                    <div style={{ fontSize: '10.5px', marginTop: '1px' }}>
                      Teléfono: {phone}
                    </div>
                    <div style={{ fontSize: '9.5px', marginTop: '2px', fontWeight: 'bold', color: '#475569' }}>
                      DOCUMENTO DE CONTROL INTERNO - PRE-ORDEN
                    </div>
                  </div>

                  <div className="ticket-divider" />

                  {/* Título de Pre-Orden */}
                  <div className="ticket-center">
                    <div className="ticket-bold" style={{ fontSize: '13px', letterSpacing: '0.5px' }}>
                      *** PRE-ORDEN / CUENTA ***
                    </div>
                    <div className="ticket-bold" style={{ fontSize: '12px', marginTop: '2px' }}>
                      PRE-ORDEN Nº: {orderNum}
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                      FECHA: {orderDate}&nbsp;&nbsp;&nbsp;HORA: {orderTime}
                    </div>
                  </div>

                  <div className="ticket-divider" />

                  {/* Bloque Comanda / Mesa / Mesero */}
                  <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>MESA:</strong> <span className="ticket-bold">{tableName || 'MOSTRADOR'}</span></span>
                      <span><strong>MESERO/CAJERO:</strong> <span className="ticket-bold">{waiterName}</span></span>
                    </div>

                    {invoice.orderType === 'delivery' && (
                      <div style={{ background: '#f0fdf4', padding: '4px 6px', borderRadius: '4px', margin: '3px 0', border: '1px solid #bbf7d0' }}>
                        <div className="ticket-bold" style={{ color: '#166534' }}>🛵 MODALIDAD: DELIVERY</div>
                        {invoice.deliveryInfo?.address && <div><strong>Dirección:</strong> {invoice.deliveryInfo.address}</div>}
                        {invoice.deliveryInfo?.phone && <div><strong>Tel:</strong> {invoice.deliveryInfo.phone}</div>}
                        {invoice.deliveryInfo?.courier && <div><strong>Repartidor:</strong> {invoice.deliveryInfo.courier}</div>}
                      </div>
                    )}

                    {invoice.orderType === 'para_llevar' && (
                      <div className="ticket-bold" style={{ color: '#7c3aed', margin: '3px 0' }}>
                        🛍️ MODALIDAD: PARA LLEVAR (RETIRO EN LOCAL)
                      </div>
                    )}

                    <div style={{ marginTop: '2px' }}>
                      <span><strong>CLIENTE:</strong> {clientInfo.name}</span>
                    </div>
                    <div>
                      <span><strong>C.I / RIF:</strong> {clientInfo.cedula || 'V-00000000'}</span>
                    </div>
                  </div>

                  <div className="ticket-divider" />

                  {/* Cabecera de Ítems */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 'bold', marginBottom: '4px' }}>
                    <span>CANT  DESCRIPCIÓN</span>
                    <span>TOTAL BS</span>
                  </div>

                  {/* Listado de Productos con Cantidades y Notas para Cocina/Mesa */}
                  <div style={{ margin: '4px 0' }}>
                    {items.map((item, idx) => {
                      const qty = Number(item.quantity || item.cantidad || 1);
                      const unitPriceUSD = Number(item.unitPrice || item.priceUSD || item.price || 0);
                      const unitPriceBs = Number(item.priceBs || (unitPriceUSD * exchangeRate));
                      const subtotalBs = Number(item.subtotalBs || (qty * unitPriceBs));
                      const noteText = item.note || item.notes;

                      return (
                        <div key={idx} style={{ marginBottom: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                            <span className="ticket-bold" style={{ textTransform: 'uppercase' }}>
                              [{qty}] {item.productName || item.name || 'PRODUCTO'}
                            </span>
                            <span className="ticket-bold">
                              {formatVE(subtotalBs)}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#444' }}>
                            <span>{qty} X {formatVE(unitPriceBs)} (${unitPriceUSD.toFixed(2)})</span>
                            <span>(Ref. ${(qty * unitPriceUSD).toFixed(2)})</span>
                          </div>

                          {/* Notas de Cocina Visibles también en la Pre-Orden */}
                          {noteText && (
                            <div style={{ fontSize: '10px', fontStyle: 'italic', color: '#b91c1c', paddingLeft: '8px' }}>
                              &gt;&gt; NOTA: {noteText}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Delivery Fee si existe */}
                  {invoice.deliveryFee > 0 && (
                    <div style={{ marginBottom: '6px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>[1] SERVICIO DE FLETE / DELIVERY</span>
                        <span className="ticket-bold">{formatVE(Number(invoice.deliveryFee) * exchangeRate)}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#444' }}>
                        Ref. ${Number(invoice.deliveryFee).toFixed(2)}
                      </div>
                    </div>
                  )}

                  <div className="ticket-double-divider" />

                  {/* Resumen de Totales en Bs y Divisas */}
                  <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                      <span>BASE IMPONIBLE (16%):</span>
                      <span>Bs. {formatVE(baseImponibleBs)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                      <span>IVA ESTIMADO (16%):</span>
                      <span>Bs. {formatVE(ivaBs)}</span>
                    </div>

                    <div className="ticket-divider" style={{ margin: '4px 0' }} />

                    {/* Total Principal en Bolívares */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', margin: '4px 0' }} className="ticket-bold">
                      <span>TOTAL BS:</span>
                      <span>Bs. {formatVE(totalBs)}</span>
                    </div>

                    {/* Total en Divisas USD */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', margin: '2px 0' }} className="ticket-bold">
                      <span>TOTAL USD (REF):</span>
                      <span>$ {totalUSD.toFixed(2)}</span>
                    </div>

                    <div style={{ fontSize: '10.5px', color: '#333', marginTop: '2px' }}>
                      Tasa Oficial BCV: Bs. {formatVE(exchangeRate, 2)} / USD
                    </div>
                  </div>

                  <div className="ticket-divider" />

                  {/* Estado de la Pre-Orden y Método de Pago */}
                  <div style={{ fontSize: '11px' }}>
                    <div>
                      <strong>ESTADO:</strong>{' '}
                      <span className="ticket-bold">
                        {isPaid ? 'PAGADO / CANCELADO' : 'PENDIENTE POR COBRAR (PRE-ORDEN)'}
                      </span>
                    </div>
                    <div style={{ marginTop: '2px' }}>
                      <strong>FORMA DE PAGO:</strong> {getPaymentLabel(paymentMethod)}
                    </div>

                    {/* Banco / Pago móvil si aplica */}
                    {(invoice.pagoMovilBank || invoice.pagoMovilRef) && (() => {
                      const bInfo = findBank(invoice.pagoMovilBank);
                      return (
                        <div style={{ fontSize: '10.5px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {bInfo && <BankLogo code={bInfo.code} size={13} />}
                          {invoice.pagoMovilBank && <span>Banco: <strong>{invoice.pagoMovilBank}</strong> </span>}
                          {invoice.pagoMovilRef && <span>| Ref: <strong>#{invoice.pagoMovilRef}</strong></span>}
                        </div>
                      );
                    })()}

                    {/* Pagos Mixtos */}
                    {paymentMethod === 'mixto' && invoice.mixedPayments && (
                      <div style={{ fontSize: '10.5px', paddingLeft: '6px', margin: '3px 0' }}>
                        {invoice.mixedPayments.efectivo_usd > 0 && <div>- Efectivo Divisas: ${Number(invoice.mixedPayments.efectivo_usd).toFixed(2)}</div>}
                        {invoice.mixedPayments.zelle > 0 && <div>- Zelle: ${Number(invoice.mixedPayments.zelle).toFixed(2)}</div>}
                        {invoice.mixedPayments.pago_movil > 0 && <div>- Pago Móvil: Bs. {formatVE(invoice.mixedPayments.pago_movil)}</div>}
                        {invoice.mixedPayments.efectivo_bs > 0 && <div>- Efectivo Bs: Bs. {formatVE(invoice.mixedPayments.efectivo_bs)}</div>}
                      </div>
                    )}

                    {/* Vuelto / Cambio si aplica */}
                    {invoice.receivedAmount > 0 && Number(invoice.receivedAmount) > totalUSD && (
                      <div style={{ fontSize: '10.5px', margin: '3px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>RECIBIDO:</span>
                          <span>${Number(invoice.receivedAmount).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                          <span>VUELTO:</span>
                          <span>Bs. {formatVE(Number(invoice.changeBs || (invoice.changeUSD * exchangeRate) || 0))} (${Number(invoice.changeUSD || 0).toFixed(2)})</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pie del Ticket Happy Days */}
                  <div className="ticket-divider" style={{ margin: '10px 0 6px 0' }} />
                  <div className="ticket-center" style={{ fontSize: '10px', lineHeight: '1.3' }}>
                    <div className="ticket-bold">{CLIENT_CONFIG.receipt?.footerGreeting || '¡Gracias por su visita!'}</div>
                    <div style={{ fontSize: '9.5px', marginTop: '2px' }}>{CLIENT_CONFIG.receipt?.contactNotice || 'Instagram: @happydays_ve'}</div>
                    <div style={{ fontSize: '9px', marginTop: '3px', color: '#64748b' }}>
                      *** PRE-ORDEN EMITIDA PARA CONTROL INTERNO ***
                    </div>
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
