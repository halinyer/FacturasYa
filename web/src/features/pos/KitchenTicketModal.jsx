import React from 'react';
import { ChefHat, Printer, X, Clock, AlertCircle } from 'lucide-react';

export default function KitchenTicketModal({
  isOpen,
  onClose,
  cart,
  orderNumber = 'CMD-101',
  tableName = 'Barra / Mostrador',
  waiter = 'Cajero 1',
  orderNotes = '',
  onPrint = () => window.print()
}) {
  if (!isOpen) return null;

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 text-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABECERA DE LA COMANDA */}
        <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <ChefHat size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Comanda de Cocina</h3>
              <p className="text-[11px] text-zinc-500 font-mono">Orden #{orderNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* TICKET TÉRMICO DE COCINA (ESTILO PAPEL IMPRESO) */}
        <div className="bg-zinc-50 p-4 rounded-xl border border-dashed border-zinc-300 font-mono text-xs space-y-3">
          <div className="text-center border-b border-dashed border-zinc-300 pb-2">
            <span className="font-black text-sm block">*** PEDIDO DE COCINA ***</span>
            <div className="flex justify-between text-[11px] text-zinc-600 mt-1">
              <span>Mesa: <strong>{tableName}</strong></span>
              <span>Hora: {now}</span>
            </div>
            <div className="text-[10px] text-zinc-500 text-left mt-0.5">
              Atiende: {waiter}
            </div>
          </div>

          {/* LISTADO DE PLATOS CON CANTIDAD CLARA Y SIN PRECIOS */}
          <div className="space-y-2 py-1">
            {cart.map((item, idx) => (
              <div key={item.id || idx} className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <span className="font-black text-sm bg-zinc-900 text-white rounded px-1.5 py-0.2">
                    {item.qty}x
                  </span>
                  <div>
                    <span className="font-bold text-zinc-900 block leading-tight">{item.name}</span>
                    {item.notes && (
                      <span className="text-[10px] text-amber-800 font-sans italic bg-amber-100/60 px-1 rounded block mt-0.5">
                        ⚠️ {item.notes}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {orderNotes && (
            <div className="border-t border-dashed border-zinc-300 pt-2 text-[11px] text-zinc-700 bg-amber-50/50 p-2 rounded">
              <span className="font-bold block">Observaciones generales:</span>
              <p>{orderNotes}</p>
            </div>
          )}

          <div className="text-center border-t border-dashed border-zinc-300 pt-2 text-[10px] text-zinc-400">
            FacturasYa · Comandera de Cocina
          </div>
        </div>

        {/* ACCIONES DEL MODAL */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onPrint}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
          >
            <Printer size={15} />
            <span>Imprimir en Comandera Térmica</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl text-zinc-600 hover:text-zinc-950 text-xs font-semibold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
