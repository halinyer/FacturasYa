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

  useEffect(() => {
    localStorage.setItem('pos_comanda_paper_size', paperSize);
  }, [paperSize]);

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  if (!round) return null;

  const items = round.items || [];
  const totalItems = items.reduce((acc, i) => acc + Number(i.quantity || 1), 0);
  const timeStr = round.sentAt ? new Date(round.sentAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  const dateStr = round.sentAt ? new Date(round.sentAt).toLocaleDateString('es-VE') : new Date().toLocaleDateString('es-VE');

  const handlePrint = () => {
    window.print();
  };

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
            max-width: ${paperSize === '58mm' ? '360px' : '440px'};
            border-radius: 14px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.15); display: flex; flex-direction: column;
            max-height: 94vh; overflow: hidden;
          }
          .kitchen-header-bar {
            display: flex; justify-content: space-between; align-items: center;
            padding: 12px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: #1e293b; color: #f8fafc;
          }
          .kitchen-content {
            padding: ${paperSize === '58mm' ? '12px 8px' : '18px 14px'};
            overflow-y: auto; background: #ffffff; color: #000000;
          }
          .kitchen-paper {
            font-family: 'Courier New', Courier, monospace;
            font-size: ${paperSize === '58mm' ? '11px' : '12.5px'};
            line-height: ${paperSize === '58mm' ? '1.25' : '1.35'};
            color: #000000; background: #ffffff; width: 100%;
          }
          .k-center { text-align: center; }
          .k-bold { font-weight: bold; }
          .k-divider { border-top: 1px dashed #000000; margin: 6px 0; }
          .k-double-divider { border-top: 2px dashed #000000; margin: 8px 0; }

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
            .kitchen-modal-overlay {
              background: transparent !important;
              padding: 0 !important;
              position: absolute !important;
              top: 0 !important; left: 0 !important;
              width: ${paperSize} !important;
            }
            .kitchen-modal-box {
              box-shadow: none !important; border: none !important;
              width: ${paperSize} !important; max-width: ${paperSize} !important;
              background: transparent !important;
            }
            .kitchen-header-bar { display: none !important; }
            .kitchen-content, .kitchen-content * {
              visibility: visible !important;
            }
            .kitchen-content {
              position: absolute !important;
              left: 0 !important; top: 0 !important;
              width: ${paperSize} !important;
              max-width: ${paperSize} !important;
              padding: 2mm 1mm !important; margin: 0 !important;
            }
          }
        `}
      </style>

      <div className="kitchen-modal-overlay">
        <div className="kitchen-modal-box">
          <div className="kitchen-header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Utensils size={18} color="#f59e0b" />
              <div style={{ fontSize: '0.9rem', fontWeight: '800' }}>
                Comanda de Cocina
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px' }}>
                <button
                  type="button"
                  onClick={() => setPaperSize('58mm')}
                  style={{
                    padding: '3px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800',
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
                    padding: '3px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800',
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
              <div className="k-center k-bold" style={{ fontSize: paperSize === '58mm' ? '14px' : '16px', letterSpacing: '1px' }}>
                *** COMANDA COCINA ***
              </div>
              <div className="k-center k-bold" style={{ fontSize: paperSize === '58mm' ? '11px' : '13px', marginTop: '2px' }}>
                HAPPY DAYS BURGER
              </div>

              <div className="k-double-divider" />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="k-bold" style={{ fontSize: paperSize === '58mm' ? '17px' : '20px' }}>
                  {tableName.toUpperCase()}
                </span>
                <span className="k-bold" style={{ fontSize: paperSize === '58mm' ? '11px' : '13px' }}>
                  {timeStr}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperSize === '58mm' ? '11px' : '12px', marginTop: '3px' }}>
                <span>MESERO: <strong style={{ fontSize: paperSize === '58mm' ? '12px' : '13px' }}>{waiterName.toUpperCase()}</strong></span>
                <span>{dateStr}</span>
              </div>

              {orderId && (
                <div style={{ fontSize: '10px', color: '#333', marginTop: '1px' }}>
                  REF: #{orderId.slice(-6)}
                </div>
              )}

              <div className="k-double-divider" />

              <div style={{ fontSize: paperSize === '58mm' ? '10px' : '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                CANT  DESCRIPCIÓN / DETALLE
              </div>

              <div style={{ margin: '4px 0' }}>
                {items.map((it, idx) => {
                  const qty = Number(it.quantity || 1);
                  const name = it.name || it.productName || 'PRODUCTO';
                  const note = (it.note || '').trim();

                  return (
                    <div key={idx} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: paperSize === '58mm' ? '13px' : '15px' }} className="k-bold">
                        <span style={{ fontSize: paperSize === '58mm' ? '14px' : '16px' }}>[{qty}]</span>
                        <span style={{ textTransform: 'uppercase' }}>{name}</span>
                      </div>

                      {note && (
                        <div style={{ 
                          fontSize: paperSize === '58mm' ? '11px' : '12px', 
                          fontWeight: 'bold', 
                          padding: '2px 5px', 
                          marginTop: '2px', 
                          borderLeft: '3px solid #000',
                          background: '#f1f5f9'
                        }}>
                          &gt;&gt; NOTA: {note}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="k-double-divider" />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperSize === '58mm' ? '12px' : '14px' }} className="k-bold">
                <span>TOTAL ÍTEMS:</span>
                <span>{totalItems} PLATO(S)</span>
              </div>

              <div className="k-divider" />

              <div className="k-center k-bold" style={{ 
                fontSize: paperSize === '58mm' ? '12px' : '14px', 
                padding: '5px', 
                border: '2px solid #000', 
                marginTop: '6px',
                textTransform: 'uppercase'
              }}>
                ENTREGAR A: {waiterName.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default KitchenTicketModal;
