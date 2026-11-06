import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Utensils } from 'lucide-react';
import { printIsolatedTicket } from '../utils/printIsolatedTicket';

export const KitchenTicketModal = ({ 
  round, 
  tableName = 'Mesa', 
  waiterName = 'Mesero', 
  orderId = '',
  onClose,
  autoPrint = false 
}) => {
  const ticketRef = useRef(null);
  const [paperSize, setPaperSize] = useState(() => {
    return localStorage.getItem('pos_comanda_paper_size') || '58mm';
  });

  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(() => {
    return localStorage.getItem('pos_comanda_printer') || '';
  });
  const [isPrinting, setIsPrinting] = useState(false);
  const [printToast, setPrintToast] = useState(null);

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
          const defaultPos = list.find(p => p.isDefault && /pos|thermal|ticket|58/i.test(p.name));
          
          if (saved && exists) {
            setSelectedPrinter(saved);
          } else if (defaultPos) {
            setSelectedPrinter(defaultPos.name);
            localStorage.setItem('pos_comanda_printer', defaultPos.name);
          } else {
            const pos = list.find(p => p.isDefault) || list.find(p => /pos-?58|pos58|ticket|thermal/i.test(p.name)) || list[0];
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
    if (isPrinting) return;
    setIsPrinting(true);
    setPrintToast({ msg: 'Enviando comanda a la impresora...', type: 'info' });
    try {
      const html = ticketRef.current ? ticketRef.current.outerHTML : '';
      const res = await printIsolatedTicket({
        html,
        paperSize,
        deviceName: selectedPrinter || '',
        silent: true
      });
      if (res && res.success === false) {
        setPrintToast({ msg: `Aviso impresora: ${res.failureReason || res.error || 'Verifica la impresora'}`, type: 'error' });
      } else {
        setPrintToast({ msg: '¡Comanda enviada a impresión!', type: 'success' });
      }
    } catch (err) {
      console.warn('Error al imprimir comanda:', err);
      setPrintToast({ msg: 'Error al enviar a la impresora: ' + (err.message || err), type: 'error' });
    } finally {
      setIsPrinting(false);
      setTimeout(() => setPrintToast(null), 3500);
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

  // Safe data extraction
  const items = Array.isArray(round.items) ? round.items : [];
  const totalItems = items.reduce((acc, i) => acc + Number(i?.quantity || 1), 0);

  const safeTableName = String(tableName || round.tableName || 'MESA').toUpperCase();
  const safeWaiterName = String(waiterName || round.waiterName || 'MESERO').toUpperCase();
  const roundNumLabel = `RONDA #${round.roundNumber || 1}`;

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
            max-width: 480px;
            border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.15); display: flex; flex-direction: column;
            max-height: 94vh; overflow: hidden;
          }
          .kitchen-header-bar {
            display: flex; flex-direction: column; gap: 10px;
            padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: #1e293b; color: #f8fafc;
          }
          .kitchen-content {
            padding: 16px 12px;
            overflow-y: auto; background: #e2e8f0; color: #000000;
            display: flex; justify-content: center; align-items: flex-start;
            flex: 1;
          }
          .kitchen-paper {
            font-family: Arial, Helvetica, sans-serif;
            font-size: ${is58 ? '10.5px' : '11.5px'};
            line-height: 1.2;
            color: #000000; background: #ffffff;
            width: 100%;
            max-width: ${is58 ? '230px' : '310px'};
            padding: 12px 10px;
            border-radius: 6px;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }
          .kitchen-footer-bar {
            display: flex; align-items: center; gap: 10px;
            padding: 12px 16px; background: #1e293b;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }
          .k-center { text-align: center; }
          .k-bold { font-weight: 700; }
          .k-divider { border-top: 1px dashed #000000; margin: 3px 0; }
          .k-double-divider { border-top: 1px dashed #000000; margin: 4px 0; }

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
            .kitchen-header-bar, .kitchen-footer-bar { display: none !important; }
            .kitchen-content, .kitchen-content * {
              visibility: visible !important;
            }
            .kitchen-content {
              position: absolute !important;
              left: 0 !important; top: 0 !important;
              width: 100% !important;
              max-width: ${is58 ? '48mm' : '72mm'} !important;
              padding: 0 !important;
              margin: 0 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .kitchen-paper {
              width: 100% !important;
              max-width: ${is58 ? '48mm' : '72mm'} !important;
              margin: 0 !important;
              padding: 0 1mm !important;
            }
          }
        `}
      </style>

      <div className="kitchen-modal-overlay" onClick={onClose}>
        <div className="kitchen-modal-box" onClick={e => e.stopPropagation()}>
          <div className="kitchen-header-bar">
            {/* Fila 1: Título y Botón Cerrar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Utensils size={18} color="#f59e0b" />
                <div style={{ fontSize: '0.95rem', fontWeight: '800' }}>
                  Comanda Cocina — {safeTableName}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                title="Cerrar ventana"
                style={{
                  background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none',
                  borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Fila 2: Impresora, Tamaño 58mm/80mm y Botón Imprimir */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '180px' }}>
                {/* Selector de impresora */}
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
                      fontSize: '0.76rem',
                      fontWeight: '700',
                      padding: '5px 8px',
                      outline: 'none',
                      cursor: 'pointer',
                      flex: 1,
                      maxWidth: '185px'
                    }}
                  >
                    {printers.map(p => (
                      <option key={p.name} value={p.name} style={{ background: '#1e293b', color: '#fff' }}>
                        🖨️ {p.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Selector de ancho */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setPaperSize('58mm')}
                    style={{
                      padding: '4px 9px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: '800',
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
                      padding: '4px 9px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: '800',
                      border: 'none', cursor: 'pointer',
                      background: !is58 ? '#e2e8f0' : 'transparent',
                      color: !is58 ? '#0f172a' : '#94a3b8'
                    }}
                  >
                    80mm
                  </button>
                </div>
              </div>

              {/* Botón imprimir superior */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={isPrinting}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
                  background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px',
                  fontWeight: '800', cursor: isPrinting ? 'wait' : 'pointer', fontSize: '0.82rem',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)', flexShrink: 0
                }}
              >
                <Printer size={15} /> {isPrinting ? 'Imprimiendo...' : 'Imprimir'}
              </button>
            </div>
          </div>

          {printToast && (
            <div style={{
              padding: '7px 14px', fontSize: '0.78rem', fontWeight: '700', color: '#fff', textAlign: 'center',
              background: printToast.type === 'success' ? '#059669' : printToast.type === 'error' ? '#dc2626' : '#0284c7'
            }}>
              {printToast.msg}
            </div>
          )}

          <div className="kitchen-content">
            <div className="kitchen-paper" ref={ticketRef}>
              {/* Minimalist Header */}
              <div className="k-center k-bold" style={{ fontSize: is58 ? '11px' : '12px', letterSpacing: '0.5px' }}>
                *** COMANDA COCINA ***
              </div>

              <div className="k-divider" />

              {/* MESA COMPACTA Y NÍTIDA */}
              <div style={{ textAlign: 'center', padding: '1px 0' }}>
                <div className="k-bold" style={{ fontSize: is58 ? '15px' : '17px', letterSpacing: '0.2px' }}>
                  {safeTableName}
                </div>
                {(round.roundNumber > 1 || round.isAdditional) && (
                  <div style={{ 
                    border: '1px solid #000', 
                    fontSize: is58 ? '9px' : '10px', 
                    fontWeight: '700', 
                    padding: '1px 4px', 
                    display: 'inline-block', 
                    marginTop: '1px', 
                    borderRadius: '2px'
                  }}>
                    *** RONDA #{round.roundNumber || 2} (EXTRA) ***
                  </div>
                )}
              </div>

              {/* HORA Y FECHA (En una sola línea nítida, sin fondo negro que queme papel) */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: is58 ? '10px' : '11px', 
                fontWeight: '700',
                borderTop: '1px dashed #000',
                borderBottom: '1px dashed #000',
                padding: '2px 0',
                margin: '2px 0'
              }}>
                <span>HORA: {timeStr}</span>
                <span>{dateStr}</span>
              </div>

              {/* MESERA Y RONDA */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: is58 ? '9.5px' : '10.5px', margin: '2px 0' }}>
                <span>MESERO: <strong>{safeWaiterName}</strong></span>
                <span><strong>{roundNumLabel}</strong></span>
              </div>

              <div className="k-divider" />

              {/* Items Section - Compacto y Nítido */}
              <div style={{ margin: '2px 0' }}>
                {items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4px 0', fontSize: '10px' }}>Sin platos</div>
                ) : (
                  items.map((it, idx) => {
                    const qty = Number(it?.quantity || 1);
                    const name = String(it?.name || it?.productName || 'PRODUCTO').toUpperCase();
                    const note = it?.note ? String(it.note).trim().toUpperCase() : '';

                    return (
                      <div key={idx} style={{ marginBottom: is58 ? '3px' : '4px', paddingBottom: '2px', borderBottom: idx < items.length - 1 ? '1px dotted #e2e8f0' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                          <span className="k-bold" style={{ fontSize: is58 ? '12px' : '13px', minWidth: '18px' }}>
                            {qty}x
                          </span>
                          <span className="k-bold" style={{ fontSize: is58 ? '11px' : '12px', flex: 1, wordBreak: 'break-word', lineHeight: '1.15' }}>
                            {name}
                          </span>
                        </div>

                        {note && (
                          <div style={{ 
                            fontSize: is58 ? '9.5px' : '10px', 
                            fontWeight: '700', 
                            padding: '1px 3px', 
                            marginTop: '1px', 
                            marginLeft: '18px',
                            borderLeft: '2px solid #000'
                          }}>
                            * {note}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="k-divider" />

              {/* Total items */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: is58 ? '10px' : '11px' }} className="k-bold">
                <span>TOTAL:</span>
                <span>{totalItems} PLATO(S)</span>
              </div>

              {/* Bottom Waiter Banner */}
              <div className="k-center k-bold" style={{ 
                fontSize: is58 ? '11px' : '12px', 
                padding: '3px 4px', 
                border: '1.5px solid #000', 
                marginTop: '4px',
                marginBottom: '4px'
              }}>
                ENTREGAR A: {safeWaiterName}
              </div>

              {/* Guía de corte y avance para pasar la cuchilla (12mm) */}
              <div style={{ textAlign: 'center', fontSize: '8px', letterSpacing: '2px', color: '#000', margin: '2px 0' }}>
                - - - - - - - - - - - - - -
              </div>
              <div style={{ height: '12mm', minHeight: '12mm', display: 'block', lineHeight: '12px' }}>
                &nbsp;<br/>&nbsp;
              </div>
            </div>
          </div>

          {/* Barra inferior fija con botón grande de Impresión */}
          <div className="kitchen-footer-bar">
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
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px 18px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff', border: 'none', borderRadius: '10px',
                fontWeight: '900', fontSize: '0.92rem', cursor: isPrinting ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
            >
              <Printer size={18} />
              {isPrinting ? 'IMPRIMIENDO COMANDA...' : `IMPRIMIR COMANDA (${paperSize.toUpperCase()})`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default KitchenTicketModal;
