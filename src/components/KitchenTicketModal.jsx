import React, { useState, useEffect } from 'react';
import { X, Printer, Utensils } from 'lucide-react';

export const KitchenTicketModal = ({ 
  round, 
  tableName = 'Mesa', 
  waiterName = 'Mesero', 
  orderId = '',
  onClose,
  autoPrint = false 
}) => {
  const [paperSize, setPaperSize] = useState(() => {
    return localStorage.getItem('pos_comanda_paper_size') || '58mm';
  });

  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(() => {
    return localStorage.getItem('pos_comanda_printer') || 'POS-58';
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
          const exists = list.some(p => p.name === saved);
          if (saved && exists) {
            setSelectedPrinter(saved);
          } else {
            const pos = list.find(p => /pos-?58|pos58|ticket|thermal/i.test(p.name)) || list.find(p => p.isDefault) || list[0];
            if (pos) {
              setSelectedPrinter(pos.name);
              localStorage.setItem('pos_comanda_printer', pos.name);
            }
          }
        }
      }).catch(e => console.warn('Printers load notice:', e));
    }
  }, []);

  const handlePrint = async () => {
    try {
      if (window.electronAPI && typeof window.electronAPI.printWindow === 'function') {
        const res = await window.electronAPI.printWindow({ 
          silent: false,
          deviceName: selectedPrinter || 'POS-58'
        });
        if (!res.success && res.failureReason) {
          console.warn('Electron print notice, falling back to window.print:', res.failureReason);
          window.print();
        }
      } else {
        window.print();
      }
    } catch (err) {
      console.warn('Fallback to browser print:', err);
      try {
        window.print();
      } catch (e) {
        alert('Error al abrir la impresora: ' + (e.message || e));
      }
    }
  };

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, selectedPrinter]);

  if (!round) return null;

  // Safe data extraction to prevent crashes
  const items = Array.isArray(round.items) ? round.items : [];
  const totalItems = items.reduce((acc, i) => acc + Number(i?.quantity || 1), 0);

  const safeTableName = String(tableName || round.tableName || 'MESA').toUpperCase();
  const safeWaiterName = String(waiterName || round.waiterName || 'MESERO').toUpperCase();
  const safeOrderId = orderId ? String(orderId).slice(-6) : (round.orderId ? String(round.orderId).slice(-6) : '');

  const formatTime = (val) => {
    try {
      const d = val ? new Date(val) : new Date();
      return isNaN(d.getTime()) 
        ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const formatDate = (val) => {
    try {
      const d = val ? new Date(val) : new Date();
      return isNaN(d.getTime()) 
        ? new Date().toLocaleDateString('es-VE')
        : d.toLocaleDateString('es-VE');
    } catch (e) {
      return '';
    }
  };

  const timeStr = formatTime(round.sentAt);
  const dateStr = formatDate(round.sentAt);

  const is58 = paperSize === '58mm';

  return (
    <>
      <style>
        {`
          .kitchen-modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.82); backdrop-filter: blur(5px);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999; padding: 12px;
          }
          .kitchen-modal-box {
            background: #0f172a; width: 100%;
            max-width: ${is58 ? '360px' : '440px'};
            border-radius: 14px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.15); display: flex; flex-direction: column;
            max-height: 94vh; overflow: hidden;
          }
          .kitchen-header-bar {
            display: flex; justify-content: space-between; align-items: center;
            padding: 10px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: #1e293b; color: #f8fafc; gap: 8px;
          }
          .kitchen-content {
            padding: ${is58 ? '10px 6px' : '16px 12px'};
            overflow-y: auto; background: #ffffff; color: #000000;
          }
          .kitchen-paper {
            font-family: 'Courier New', Courier, monospace;
            font-size: ${is58 ? '11px' : '12.5px'};
            line-height: ${is58 ? '1.2' : '1.3'};
            color: #000000; background: #ffffff; width: 100%;
          }
          .k-center { text-align: center; }
          .k-bold { font-weight: 900; }
          .k-divider { border-top: 1px dashed #000000; margin: 4px 0; }
          .k-double-divider { border-top: 2px dashed #000000; margin: 6px 0; }

          @media print {
            @page {
              size: ${is58 ? '58mm auto' : '80mm auto'};
              margin: 0mm;
            }
            html, body {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }
            body * {
              visibility: hidden !important;
            }
            .kitchen-modal-overlay {
              background: transparent !important;
              padding: 0 !important;
              position: absolute !important;
              top: 0 !important; left: 0 !important;
              width: 100% !important;
            }
            .kitchen-modal-box {
              box-shadow: none !important; border: none !important;
              width: 100% !important; max-width: 100% !important;
              background: transparent !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .kitchen-header-bar { display: none !important; }
            .kitchen-content, .kitchen-content * {
              visibility: visible !important;
            }
            .kitchen-content {
              position: absolute !important;
              left: 0 !important; top: 0 !important;
              width: ${is58 ? '48mm' : '72mm'} !important;
              max-width: ${is58 ? '48mm' : '72mm'} !important;
              padding: 1mm 1mm 12mm 1mm !important; 
              margin: 0 auto !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}
      </style>

      <div className="kitchen-modal-overlay" onClick={onClose}>
        <div className="kitchen-modal-box" onClick={e => e.stopPropagation()}>
          <div className="kitchen-header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Utensils size={17} color="#f59e0b" />
              <div style={{ fontSize: '0.85rem', fontWeight: '800', whiteSpace: 'nowrap' }}>
                Comanda Chef
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Printers selector */}
              {printers.length > 0 && (
                <select
                  value={selectedPrinter}
                  onChange={(e) => {
                    setSelectedPrinter(e.target.value);
                    localStorage.setItem('pos_comanda_printer', e.target.value);
                  }}
                  title="Impresora de Comandas"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    color: '#f8fafc',
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '3px 6px',
                    outline: 'none',
                    cursor: 'pointer',
                    maxWidth: '115px'
                  }}
                >
                  {printers.map(p => (
                    <option key={p.name} value={p.name} style={{ background: '#1e293b', color: '#fff' }}>
                      🖨️ {p.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Paper format selector */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px' }}>
                <button
                  type="button"
                  onClick={() => setPaperSize('58mm')}
                  style={{
                    padding: '3px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800',
                    border: 'none', cursor: 'pointer',
                    background: is58 ? '#e2e8f0' : 'transparent',
                    color: is58 ? '#0f172a' : '#94a3b8'
                  }}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => setPaperSize('80mm')}
                  style={{
                    padding: '3px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800',
                    border: 'none', cursor: 'pointer',
                    background: !is58 ? '#e2e8f0' : 'transparent',
                    color: !is58 ? '#0f172a' : '#94a3b8'
                  }}
                >
                  80mm
                </button>
              </div>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px',
                  background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px',
                  fontWeight: '800', cursor: 'pointer', fontSize: '0.8rem'
                }}
              >
                <Printer size={14} /> Imprimir
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none',
                  borderRadius: '8px', padding: '6px', cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="kitchen-content">
            <div className="kitchen-paper">
              {/* Header Title */}
              <div className="k-center k-bold" style={{ fontSize: is58 ? '13px' : '15px', letterSpacing: '0.5px' }}>
                *** COMANDA COCINA ***
              </div>
              <div className="k-center k-bold" style={{ fontSize: is58 ? '10px' : '12px', marginTop: '1px' }}>
                HAPPY DAYS BURGER
              </div>

              <div className="k-double-divider" />

              {/* Huge Table and Waiter Header */}
              <div style={{ textAlign: 'center', padding: '2px 0' }}>
                <div className="k-bold" style={{ fontSize: is58 ? '18px' : '22px', letterSpacing: '0.5px' }}>
                  {safeTableName}
                </div>
              </div>

              <div className="k-divider" />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: is58 ? '10px' : '11px', marginTop: '2px' }}>
                <span className="k-bold">MESERA: {safeWaiterName}</span>
                <span>{timeStr}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: is58 ? '9px' : '10px', color: '#333', marginTop: '1px' }}>
                <span>FECHA: {dateStr}</span>
                {safeOrderId && <span>REF: #{safeOrderId}</span>}
              </div>

              <div className="k-double-divider" />

              {/* Items Section */}
              <div style={{ fontSize: is58 ? '9.5px' : '10.5px', fontWeight: '900', marginBottom: '3px' }}>
                CANT &nbsp;DESCRIPCIÓN / DETALLE
              </div>
              <div className="k-divider" />

              <div style={{ margin: '3px 0' }}>
                {items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '11px' }}>Sin ítems</div>
                ) : (
                  items.map((it, idx) => {
                    const qty = Number(it?.quantity || 1);
                    const name = String(it?.name || it?.productName || 'PRODUCTO').toUpperCase();
                    const note = it?.note ? String(it.note).trim().toUpperCase() : '';

                    return (
                      <div key={idx} style={{ marginBottom: is58 ? '6px' : '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                          <span className="k-bold" style={{ fontSize: is58 ? '14px' : '16px', minWidth: is58 ? '28px' : '32px' }}>
                            [{qty}]
                          </span>
                          <span className="k-bold" style={{ fontSize: is58 ? '12px' : '14px', flex: 1, wordBreak: 'break-word' }}>
                            {name}
                          </span>
                        </div>

                        {note && (
                          <div style={{ 
                            fontSize: is58 ? '10.5px' : '12px', 
                            fontWeight: '900', 
                            padding: '2px 4px', 
                            marginTop: '2px', 
                            marginLeft: is58 ? '10px' : '16px',
                            borderLeft: '2.5px solid #000',
                            background: '#f1f5f9'
                          }}>
                            &gt;&gt;&gt; NOTA: {note}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="k-double-divider" />

              {/* Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: is58 ? '11px' : '13px' }} className="k-bold">
                <span>TOTAL ÍTEMS:</span>
                <span>{totalItems} PLATO(S)</span>
              </div>

              <div className="k-divider" />

              {/* Waiter Delivery Box */}
              <div className="k-center k-bold" style={{ 
                fontSize: is58 ? '12px' : '14px', 
                padding: '4px', 
                border: '2px solid #000', 
                marginTop: '5px',
                letterSpacing: '0.5px'
              }}>
                ENTREGAR A: {safeWaiterName}
              </div>

              {/* Paper feed spacer for cutter */}
              <div style={{ height: is58 ? '15px' : '20px' }}>&nbsp;</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default KitchenTicketModal;
