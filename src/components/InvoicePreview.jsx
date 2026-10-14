import React from 'react';
import { X, Printer, CheckCircle, AlertTriangle, Receipt } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { CLIENT_CONFIG } from '../config/clientConfig';

const InvoicePreview = ({ invoice, onClose }) => {
  const { clients = [] } = useData() || {};
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('es-VE') + ' ' + new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    const d = new Date(dateString);
    return isNaN(d.getTime()) 
      ? dateString 
      : d.toLocaleDateString('es-VE', { 
          year: 'numeric', month: '2-digit', day: '2-digit', 
          hour: '2-digit', minute: '2-digit' 
        });
  };

  // Resolve client info
  const getClientData = () => {
    if (invoice.client && typeof invoice.client === 'object') return invoice.client;
    const found = clients.find(c => c.id === invoice.clientId);
    return {
      name: invoice.clientName || (found ? found.name : 'Consumidor Final'),
      cedula: invoice.clientCedula || (found ? found.cedula : 'V-00000000'),
      type: invoice.clientType || (found ? found.type : 'normal'),
      phone: found ? found.phone : ''
    };
  };

  const clientInfo = getClientData();
  const items = invoice.items || [];
  const totalUSD = Number(invoice.totalUSD || invoice.total || 0);
  const exchangeRate = Number(invoice.exchangeRate || invoice.tasaCambio || 876.80);
  const totalBs = Number(invoice.totalBs || totalUSD * exchangeRate);
  const paymentMethod = invoice.paymentMethod || invoice.metodoPago || 'efectivo_usd';
  const status = (invoice.status || invoice.estado || 'paid').toLowerCase();
  const isPaid = status === 'paid' || status === 'pagada';

  const formatPaymentMethod = (m) => {
    if (m === 'pago_movil') return 'Pago Móvil (Bs)';
    if (m === 'efectivo_usd') return 'Efectivo en Dólares ($)';
    if (m === 'efectivo_bs') return 'Efectivo en Bolívares (Bs)';
    if (m === 'zelle') return 'Zelle (USD)';
    if (m === 'mixto') return 'Pago Mixto / Dividido';
    return m;
  };

  return (
    <>
      <style>
        {`
          .invoice-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            z-index: 1000; padding: 16px;
          }
          .invoice-modal {
            background: #11131a; width: 100%; max-width: 440px;
            border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.1); display: flex; flex-direction: column;
            max-height: 94vh; color: #0f172a; overflow: hidden;
          }
          .invoice-header-bar {
            display: flex; justify-content: space-between; align-items: center;
            padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            background: #161922; color: #f8fafc;
          }
          .invoice-content {
            padding: 24px 20px; overflow-y: auto; background: #ffffff; color: #000000;
          }
          .thermal-ticket {
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            line-height: 1.4;
            color: #000;
          }
          .ticket-center { text-align: center; }
          .ticket-bold { font-weight: bold; }
          .ticket-divider { border-top: 1px dashed #000; margin: 8px 0; }
          .ticket-double-divider { border-top: 2px dashed #000; margin: 10px 0; }
          .ticket-table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 8px 0; }
          .ticket-table th { text-align: left; border-bottom: 1px solid #000; padding: 4px 2px; }
          .ticket-table td { padding: 4px 2px; }
          .ticket-right { text-align: right; }
          
          @media print {
            body * { visibility: hidden !important; }
            .invoice-overlay { background: transparent !important; padding: 0 !important; position: absolute !important; top: 0 !important; left: 0 !important; }
            .invoice-modal { box-shadow: none !important; border: none !important; width: 80mm !important; max-width: 80mm !important; border-radius: 0 !important; }
            .invoice-header-bar { display: none !important; }
            .invoice-content, .invoice-content * { visibility: visible !important; }
            .invoice-content { position: absolute !important; left: 0 !important; top: 0 !important; width: 80mm !important; padding: 4mm !important; }
          }
        `}
      </style>

      <div className="invoice-overlay" onClick={onClose}>
        <div className="invoice-modal" onClick={e => e.stopPropagation()}>
          
          {/* Header Action Bar */}
          <div className="invoice-header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={18} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>
                Nota de Entrega {invoice.invoiceNumber || (invoice.isPreBill ? '(Pre-cuenta)' : `NE-${invoice.id}`)}
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button"
                onClick={handlePrint}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                  background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '8px',
                  fontWeight: '800', cursor: 'pointer', fontSize: '0.82rem'
                }}
              >
                <Printer size={15} /> Imprimir Ticket (80mm)
              </button>
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
          </div>

          {/* Thermal POS Receipt Layout (Ready for physical POS ticket printer 80mm / 58mm) */}
          <div className="invoice-content">
            <div className="thermal-ticket">
              
              {/* Business Header */}
              <div className="ticket-center">
                <div className="ticket-bold" style={{ fontSize: '17px', letterSpacing: '0.5px' }}>{CLIENT_CONFIG.receipt.headerTitle}</div>
                <div style={{ fontSize: '11px', fontWeight: '600' }}>{CLIENT_CONFIG.receipt.subtitle}</div>
                <div style={{ fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{CLIENT_CONFIG.receipt.nonFiscalNotice}</div>
                <div style={{ fontSize: '11px' }}>RIF: {CLIENT_CONFIG.rif}</div>
                <div style={{ fontSize: '11px' }}>{CLIENT_CONFIG.address}</div>
                <div style={{ fontSize: '11px' }}>Teléfono: {CLIENT_CONFIG.phone}</div>
              </div>

              <div className="ticket-divider" />

              {/* Title Badge */}
              <div className="ticket-center ticket-bold" style={{ fontSize: '13px', letterSpacing: '0.5px', padding: '2px 0' }}>
                {invoice.isPreBill ? '*** NOTA DE ENTREGA / PRE-CUENTA ***' : '*** NOTA DE ENTREGA ***'}
              </div>

              <div className="ticket-divider" />

              {/* Invoice Metadata */}
              <div style={{ fontSize: '12px' }}>
                <div><strong>NOTA DE ENTREGA Nº:</strong> {invoice.invoiceNumber || (invoice.isPreBill ? 'PRE-CUENTA' : `NE-${invoice.id}`)}</div>
                <div><strong>FECHA / HORA:</strong> {formatDate(invoice.date)}</div>
                {invoice.tableName && (
                  <div><strong>MESA:</strong> <span className="ticket-bold">{invoice.tableName}</span> {invoice.waiterName ? `(Mesero: ${invoice.waiterName})` : ''}</div>
                )}
                <div><strong>CLIENTE:</strong> {clientInfo.name}</div>
                <div><strong>C.I / RIF:</strong> {clientInfo.cedula}</div>
                {clientInfo.type === 'congelador' && (
                  <div><strong>TIPO:</strong> <span className="ticket-bold">CLIENTE CONGELADOR (CRÉDITO)</span></div>
                )}
                <div><strong>TASA BCV DÍA:</strong> Bs. {exchangeRate.toFixed(2)} / USD</div>
              </div>

              <div className="ticket-divider" />

              {/* Items Table */}
              <table className="ticket-table">
                <thead>
                  <tr>
                    <th>CANT</th>
                    <th>DESCRIPCIÓN</th>
                    <th className="ticket-right">P.UNIT</th>
                    <th className="ticket-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const qty = Number(item.quantity || item.cantidad || 1);
                    const unitPrice = Number(item.unitPrice || item.priceUSD || item.price || 0);
                    const subtotal = Number(item.subtotal || qty * unitPrice);

                    return (
                      <tr key={idx}>
                        <td className="ticket-bold">{qty}x</td>
                        <td>{item.productName || item.name || 'Helado'}</td>
                        <td className="ticket-right">${unitPrice.toFixed(2)}</td>
                        <td className="ticket-right ticket-bold">${subtotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="ticket-double-divider" />

              {/* Financial Totals */}
              <div style={{ fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>SUBTOTAL ($):</span>
                  <span className="ticket-bold">${totalUSD.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '15px' }} className="ticket-bold">
                  <span>TOTAL USD:</span>
                  <span>${totalUSD.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '14px' }} className="ticket-bold">
                  <span>TOTAL Bs (Tasa {exchangeRate.toFixed(4)}):</span>
                  <span>Bs. {totalBs.toFixed(2)}</span>
                </div>
              </div>

              <div className="ticket-divider" />

              {/* Payment Method & Status */}
              <div style={{ fontSize: '12px' }}>
                <div><strong>FORMA DE PAGO:</strong> {formatPaymentMethod(paymentMethod)}</div>
                
                {(invoice.pagoMovilBank || invoice.pagoMovilRef) && (
                  <div style={{ fontSize: '11px', marginTop: '2px', color: '#1e293b' }}>
                    {invoice.pagoMovilBank && <span>Banco: <strong>{invoice.pagoMovilBank}</strong> </span>}
                    {invoice.pagoMovilRef && <span>| Ref: <strong>#{invoice.pagoMovilRef}</strong></span>}
                  </div>
                )}
                
                {paymentMethod === 'mixto' && invoice.mixedPayments && (
                  <div style={{ paddingLeft: '8px', marginBottom: '4px', fontSize: '11px' }}>
                    {invoice.mixedPayments.efectivo_usd > 0 && <div>- Efectivo $: {invoice.mixedPayments.efectivo_usd.toFixed(2)}</div>}
                    {invoice.mixedPayments.zelle > 0 && <div>- Zelle $: {invoice.mixedPayments.zelle.toFixed(2)}</div>}
                    {invoice.mixedPayments.pago_movil > 0 && <div>- Pago Móvil: Bs. {invoice.mixedPayments.pago_movil.toFixed(2)}</div>}
                    {invoice.mixedPayments.efectivo_bs > 0 && <div>- Efectivo Bs: Bs. {invoice.mixedPayments.efectivo_bs.toFixed(2)}</div>}
                  </div>
                )}

                {invoice.receivedAmount > 0 && Number(invoice.receivedAmount) > totalUSD && paymentMethod !== 'mixto' && (
                  <div style={{ margin: '3px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>RECIBIDO:</span>
                      <span>${Number(invoice.receivedAmount).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }} className="ticket-bold">
                      <span>VUELTO:</span>
                      <span>${Number(invoice.changeUSD || 0).toFixed(2)} (Bs. {Number(invoice.changeBs || 0).toFixed(2)})</span>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: '2px' }}>
                  <strong>ESTADO:</strong>{' '}
                  <span className="ticket-bold" style={{ textDecoration: 'underline' }}>
                    {status === 'voided' || status === 'anulada' 
                      ? '*** ANULADA ***' 
                      : invoice.isPreBill 
                        ? '*** POR PAGAR (PRE-CUENTA / CUENTA) ***'
                        : isPaid 
                          ? '*** PAGADO / CANCELADO ***' 
                          : '*** PENDIENTE POR COBRAR ***'}
                  </span>
                </div>
                {(status === 'voided' || status === 'anulada') && invoice.voidReason && (
                  <div style={{ fontSize: '11px', marginTop: '4px', fontStyle: 'italic', color: '#dc2626' }}>
                    Motivo de Anulación: {invoice.voidReason}
                  </div>
                )}
                {invoice.isPreBill && (
                  <div style={{ fontSize: '11px', marginTop: '4px', fontStyle: 'italic', color: '#1e40af' }}>
                    * Pre-cuenta emitida para revisión antes del pago.
                  </div>
                )}
                {!invoice.isPreBill && !isPaid && status !== 'voided' && status !== 'anulada' && (
                  <div style={{ fontSize: '11px', marginTop: '4px', fontStyle: 'italic' }}>
                    * Registrado en cuenta por cobrar de cliente.
                  </div>
                )}
              </div>

              <div className="ticket-divider" />

              {/* Footer */}
              <div className="ticket-center" style={{ fontSize: '11px', marginTop: '6px' }}>
                <div className="ticket-bold">{CLIENT_CONFIG.receipt.footerGreeting}</div>
                <div style={{ fontSize: '10px', marginTop: '2px' }}>{CLIENT_CONFIG.receipt.contactNotice}</div>
                <div style={{ fontSize: '9px', marginTop: '4px', color: '#555' }}>--------------------------------</div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default InvoicePreview;
