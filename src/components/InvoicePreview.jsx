import React from 'react';
import { X, Printer, Receipt } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { CLIENT_CONFIG } from '../config/clientConfig';
import { BankLogo, findBank } from '../utils/venezuelaBanks';

// Formateador de montos en Bolívares con estándar venezolano (punto miles, coma decimales)
export const formatVE = (num, decimals = 2) => {
  const val = Number(num) || 0;
  return val.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

// Formato de fecha fiscal DD-MM-YYYY
export const getFiscalDate = (dateVal) => {
  const d = dateVal ? new Date(dateVal) : new Date();
  if (isNaN(d.getTime())) return new Date().toLocaleDateString('es-VE');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Formato de hora fiscal HH:MM
export const getFiscalTime = (dateVal) => {
  const d = dateVal ? new Date(dateVal) : new Date();
  if (isNaN(d.getTime())) {
    return new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  }
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Formato de número de factura fiscal SENIAT a 8 dígitos (ej. 00011898)
export const getFiscalInvoiceNumber = (invoice) => {
  if (invoice.isPreBill) return 'PRE-ORDEN';
  if (invoice.fiscalInvoiceNumber) return String(invoice.fiscalInvoiceNumber).padStart(8, '0');
  if (invoice.invoiceNumber) {
    const digits = String(invoice.invoiceNumber).replace(/\D/g, '');
    if (digits) return digits.padStart(8, '0').slice(-8);
    return String(invoice.invoiceNumber);
  }
  const idDigits = String(invoice.id || '1').replace(/\D/g, '') || '1';
  return idDigits.padStart(8, '0').slice(-8);
};

// Etiqueta fiscal de método de pago SENIAT
export const getFiscalPaymentLabel = (method) => {
  const m = String(method || '').toLowerCase();
  if (m.includes('tarjeta') || m.includes('debito') || m.includes('punto')) return 'TARJETA 1';
  if (m === 'pago_movil') return 'PAGO MÓVIL';
  if (m === 'efectivo_usd') return 'EFECTIVO DIVISAS (USD)';
  if (m === 'efectivo_bs') return 'EFECTIVO BOLÍVARES';
  if (m === 'zelle') return 'ZELLE / DIVISAS';
  if (m === 'mixto') return 'PAGO MIXTO';
  return (method || 'TARJETA 1').toUpperCase();
};

const InvoicePreview = ({ invoice, onClose }) => {
  const { clients = [] } = useData() || {};
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
  const paymentMethod = invoice.paymentMethod || invoice.metodoPago || 'tarjeta';
  const status = (invoice.status || invoice.estado || 'paid').toLowerCase();
  const isPaid = status === 'paid' || status === 'pagada';

  // Desglose Tributario Fiscal SENIAT (IVA 16% alícuota general G)
  // En gastronomía y POS comercial, los precios de venta al público ya incluyen el IVA
  const baseImponibleBs = Number((totalBs / 1.16).toFixed(2));
  const ivaBs = Number((totalBs - baseImponibleBs).toFixed(2));

  // Número fiscal formateado
  const invoiceNumFormatted = getFiscalInvoiceNumber(invoice);
  const fiscalDate = getFiscalDate(invoice.date || invoice.createdAt);
  const fiscalTime = getFiscalTime(invoice.date || invoice.createdAt);

  // Datos fiscales de la empresa
  const legalName = CLIENT_CONFIG.legalName || 'INVERSIONES HAPPY DAYS 1 C.A';
  const rif = CLIENT_CONFIG.rif || 'J-500195923';
  const phone = CLIENT_CONFIG.phone || '0412-4444929';
  const addressLines = CLIENT_CONFIG.addressLines || [
    'AV FRANCISCO DE MIRANDA FRENTE EL MARQUEZ',
    'C.C UNICENTRO EL MARQUEZ LOCAL NR0126',
    'URB EL MARQUEZ CARACAS PETARE MIRANDA',
    'ZONA POSTAL 1070'
  ];

  // Serial y modelo fiscal (Memoria de Auditoría Fiscal)
  const fiscalMachineCode = CLIENT_CONFIG.fiscalMachine?.type || CLIENT_CONFIG.receipt?.fiscalMachineCode || 'MH';
  const fiscalSerial = CLIENT_CONFIG.fiscalMachine?.serial || CLIENT_CONFIG.receipt?.fiscalSerial || 'Z7C7011149';

  // Identificador de cajero o mesero
  const cashierIdentifier = invoice.waiterName || invoice.cashierName || invoice.serverName || invoice.seller || '001';

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
            background: #0f172a; width: 100%; max-width: 440px;
            border-radius: 14px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.12); display: flex; flex-direction: column;
            max-height: 94vh; overflow: hidden;
          }
          .invoice-header-bar {
            display: flex; justify-content: space-between; align-items: center;
            padding: 12px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            background: #1e293b; color: #f8fafc;
          }
          .invoice-content {
            padding: 22px 20px; overflow-y: auto; background: #ffffff; color: #000000;
          }
          .fiscal-ticket {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11.5px;
            line-height: 1.35;
            color: #000000;
            background: #ffffff;
            margin: 0 auto;
          }
          .fiscal-center { text-align: center; }
          .fiscal-right { text-align: right; }
          .fiscal-bold { font-weight: bold; }
          .fiscal-divider {
            border-top: 1px dashed #000000;
            margin: 6px 0;
          }
          .fiscal-double-divider {
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
          
          {/* Header Action Bar */}
          <div className="invoice-header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={18} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '700' }}>
                {invoice.isPreBill ? 'Pre-orden / Consumo' : `Factura Fiscal SENIAT: ${invoiceNumFormatted}`}
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

          {/* Formato Fiscal Oficial SENIAT (Copia Fiel del Ticket Fiscal Happy Days) */}
          <div className="invoice-content">
            <div className="fiscal-ticket">
              
              {/* Encabezado Fiscal SENIAT */}
              <div className="fiscal-center">
                <div className="fiscal-bold" style={{ fontSize: '14px', letterSpacing: '1px' }}>
                  {CLIENT_CONFIG.receipt?.headerTop || 'SENIAT'}
                </div>
                <div className="fiscal-bold" style={{ fontSize: '12px', marginTop: '1px' }}>
                  {rif}
                </div>
                <div className="fiscal-bold" style={{ fontSize: '12px', marginTop: '1px', textTransform: 'uppercase' }}>
                  {legalName}
                </div>
                {addressLines.map((line, idx) => (
                  <div key={idx} style={{ fontSize: '10.5px', lineHeight: '1.25' }}>
                    {line}
                  </div>
                ))}
                <div style={{ fontSize: '10.5px', marginTop: '1px' }}>
                  Tel.: {phone}
                </div>
              </div>

              <div className="fiscal-divider" />

              {/* Bloque de Datos del Cliente */}
              <div style={{ fontSize: '11px', lineHeight: '1.35' }}>
                <div><strong>Cliente:</strong> {clientInfo.name}</div>
                <div><strong>Rif/Ced:</strong> {clientInfo.cedula || 'V-00000000'}</div>
                {clientInfo.address && <div><strong>Dir.:</strong> {clientInfo.address}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>Tel.:</strong> {clientInfo.phone || phone}</span>
                  <span><strong>Cajero:</strong> {cashierIdentifier}</span>
                </div>
              </div>

              <div className="fiscal-divider" />

              {/* Título del Documento y Numeración Fiscal */}
              <div className="fiscal-center">
                <div className="fiscal-bold" style={{ fontSize: '13px', letterSpacing: '1px' }}>
                  {invoice.isPreBill ? '*** NOTA DE ENTREGA / PRE-ORDEN ***' : 'FACTURA'}
                </div>
                <div className="fiscal-bold" style={{ fontSize: '12px', marginTop: '2px' }}>
                  {invoice.isPreBill ? `PRE-ORDEN Nº: ${invoiceNumFormatted}` : `FACTURA: ${invoiceNumFormatted}`}
                </div>
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  FECHA: {fiscalDate}&nbsp;&nbsp;&nbsp;HORA: {fiscalTime}
                </div>
                {invoice.tableName && (
                  <div className="fiscal-bold" style={{ fontSize: '11px', marginTop: '2px' }}>
                    MESA: {invoice.tableName} {invoice.waiterName ? `(Mesero: ${invoice.waiterName})` : ''}
                  </div>
                )}
                {invoice.orderType === 'delivery' && (
                  <div style={{ fontSize: '10.5px', marginTop: '2px', fontStyle: 'italic' }}>
                    🛵 MODALIDAD: DELIVERY {invoice.deliveryInfo?.courier ? `(${invoice.deliveryInfo.courier})` : ''}
                  </div>
                )}
                {invoice.orderType === 'para_llevar' && (
                  <div style={{ fontSize: '10.5px', marginTop: '2px', fontStyle: 'italic' }}>
                    🛍️ MODALIDAD: PARA LLEVAR
                  </div>
                )}
              </div>

              <div className="fiscal-divider" />

              {/* Listado de Productos Fiscales */}
              <div style={{ margin: '6px 0' }}>
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
                    <div key={idx} style={{ marginBottom: '6px' }}>
                      <div className="fiscal-bold" style={{ textTransform: 'uppercase', fontSize: '11.5px' }}>
                        {item.productName || item.name || 'PRODUCTO'}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span>{qtyFormatted} X {formatVE(unitPriceBs)}</span>
                        <span className="fiscal-bold">{formatVE(subtotalBs)} (G)</span>
                      </div>
                      {item.notes && (
                        <div style={{ fontSize: '9.5px', fontStyle: 'italic', color: '#333', paddingLeft: '4px' }}>
                          * {item.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Flete o Delivery si aplica */}
              {invoice.deliveryFee > 0 && (
                <div style={{ marginBottom: '6px' }}>
                  <div className="fiscal-bold" style={{ textTransform: 'uppercase', fontSize: '11px' }}>
                    SERVICIO DE FLETE / ENVÍO
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span>1,000 X {formatVE(Number(invoice.deliveryFee) * exchangeRate)}</span>
                    <span className="fiscal-bold">{formatVE(Number(invoice.deliveryFee) * exchangeRate)} (G)</span>
                  </div>
                </div>
              )}

              {/* Desglose de Base Imponible e IVA 16% */}
              <div className="fiscal-divider" />
              <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>BI G16,00%&nbsp;&nbsp;{formatVE(baseImponibleBs)}</span>
                <span>IVA G16,00%&nbsp;&nbsp;{formatVE(ivaBs)}</span>
              </div>
              <div className="fiscal-divider" />

              {/* Total en Bolívares */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', margin: '4px 0' }} className="fiscal-bold">
                <span>TOTAL</span>
                <span>{formatVE(totalBs)}</span>
              </div>

              {/* Referencia en Divisas (USD) y Tasa Oficial */}
              <div style={{ fontSize: '10.5px', color: '#222', marginBottom: '8px' }}>
                (Ref. ${totalUSD.toFixed(2)} - Tasa BCV: Bs. {formatVE(exchangeRate, 2)})
              </div>

              {/* Forma de Pago */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', margin: '4px 0' }} className="fiscal-bold">
                <span>{getFiscalPaymentLabel(paymentMethod)}</span>
                <span>{formatVE(totalBs)}</span>
              </div>

              {/* Detalle Pago Móvil / Banco si existe */}
              {(invoice.pagoMovilBank || invoice.pagoMovilRef) && (() => {
                const bInfo = findBank(invoice.pagoMovilBank);
                return (
                  <div style={{ fontSize: '10.5px', margin: '2px 0 4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {bInfo && <BankLogo code={bInfo.code} size={13} />}
                    {invoice.pagoMovilBank && <span>Banco: <strong>{invoice.pagoMovilBank}</strong> </span>}
                    {invoice.pagoMovilRef && <span>| Ref: <strong>#{invoice.pagoMovilRef}</strong></span>}
                  </div>
                );
              })()}

              {/* Detalle de Pago Mixto */}
              {paymentMethod === 'mixto' && invoice.mixedPayments && (
                <div style={{ fontSize: '10.5px', paddingLeft: '6px', margin: '3px 0' }}>
                  {invoice.mixedPayments.efectivo_usd > 0 && <div>- Efectivo Divisas: ${Number(invoice.mixedPayments.efectivo_usd).toFixed(2)}</div>}
                  {invoice.mixedPayments.zelle > 0 && <div>- Zelle / Divisas: ${Number(invoice.mixedPayments.zelle).toFixed(2)}</div>}
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
                    <span>CAMBIO / VUELTO:</span>
                    <span>Bs. {formatVE(Number(invoice.changeBs || (invoice.changeUSD * exchangeRate) || 0))} (${Number(invoice.changeUSD || 0).toFixed(2)})</span>
                  </div>
                </div>
              )}

              {/* Pie Fiscal: Memoria y Serial de Impresora Fiscal SENIAT */}
              <div style={{ borderTop: '1px dashed #000', margin: '14px 0 6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', letterSpacing: '1px' }} className="fiscal-bold">
                <span>{fiscalMachineCode}</span>
                <span>{fiscalSerial}</span>
              </div>

              {/* Saludo y Redes de Happy Days */}
              <div className="fiscal-center" style={{ fontSize: '10px', marginTop: '10px', lineHeight: '1.3' }}>
                <div className="fiscal-bold">{CLIENT_CONFIG.receipt?.footerGreeting || '¡Gracias por su compra!'}</div>
                <div style={{ fontSize: '9.5px', marginTop: '2px' }}>{CLIENT_CONFIG.receipt?.contactNotice || 'Instagram: @happydays_ve'}</div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default InvoicePreview;
