import React from 'react';
import { CLIENT_CONFIG } from '../../config/clientConfig';
import { formatVE } from '../../utils/seniatCsvExporter';

export default function TaxSummaryForma30({ taxSummary }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Tarjeta de Autoliquidación del Mes */}
      <div className="lg:col-span-7 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-zinc-950">
            Autoliquidación del IVA (Forma 30 SENIAT)
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Cálculo mensual oficial que contrasta el Débito Fiscal contra el Crédito Fiscal para determinar la cuota tributaria a enterar.
          </p>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl border border-zinc-100 font-semibold text-zinc-800">
            <span>(+) Débito Fiscal Generado (Ventas):</span>
            <span className="font-mono font-bold text-amber-800">Bs. {formatVE(taxSummary.debitoFiscal)}</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl border border-zinc-100 font-semibold text-zinc-800">
            <span>(-) Crédito Fiscal Deducible (Compras):</span>
            <span className="font-mono font-bold text-emerald-800">Bs. {formatVE(taxSummary.creditoFiscal)}</span>
          </div>

          <div className="border-t border-dashed border-zinc-200 my-2" />

          <div
            className={`flex justify-between items-center p-4 rounded-xl border ${
              taxSummary.isCuotaPagar
                ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            }`}
          >
            <div>
              <div className="font-extrabold text-xs">
                {taxSummary.isCuotaPagar ? 'CUOTA TRIBUTARIA A PAGAR (IVA):' : 'SALDO A FAVOR DEL CONTRIBUYENTE:'}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                {taxSummary.isCuotaPagar ? 'Monto a enterar en portal fiscal SENIAT' : 'Deducible en el próximo período fiscal'}
              </div>
            </div>
            <div className={`text-xl font-mono font-black ${taxSummary.isCuotaPagar ? 'text-rose-700' : 'text-emerald-700'}`}>
              Bs. {formatVE(taxSummary.isCuotaPagar ? taxSummary.montoPagar : taxSummary.saldoAFavor)}
            </div>
          </div>

          <div className="flex justify-between items-center p-3 bg-purple-50/60 rounded-xl border border-purple-100">
            <div>
              <span className="font-bold text-purple-900 block">(+) IGTF 3% Percibido en Divisas:</span>
              <span className="text-[11px] text-purple-700">Obligación independiente al débito fiscal</span>
            </div>
            <span className="font-mono font-bold text-purple-900 text-sm">Bs. {formatVE(taxSummary.igtfTotal)}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-zinc-950 text-white rounded-xl shadow-xs">
            <span className="font-bold text-xs uppercase tracking-wider">TOTAL A ENTERAR AL SENIAT (IVA + IGTF):</span>
            <span className="font-mono font-black text-lg text-emerald-400">
              Bs. {formatVE(taxSummary.totalPagarSeniat)}
            </span>
          </div>
        </div>
      </div>

      {/* Tarjeta de Datos de la Razón Social y Parámetros */}
      <div className="lg:col-span-5 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-zinc-950">
            Identificación Fiscal del Contribuyente
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Parámetros oficiales vigentes del comercio</p>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <strong className="text-zinc-500 font-semibold block text-[11px]">Razón Social:</strong>
            <div className="font-bold text-zinc-950 text-sm">{CLIENT_CONFIG.legalName || 'MI NEGOCIO C.A.'}</div>
          </div>

          <div>
            <strong className="text-zinc-500 font-semibold block text-[11px]">RIF:</strong>
            <div className="font-mono font-bold text-zinc-900">{CLIENT_CONFIG.rif || 'J-00000000-0'}</div>
          </div>

          <div>
            <strong className="text-zinc-500 font-semibold block text-[11px]">Dirección Fiscal:</strong>
            <div className="text-zinc-700 leading-relaxed">
              {(CLIENT_CONFIG.addressLines || []).join(', ') || 'Caracas, Venezuela'}
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-3">
            <strong className="text-zinc-500 font-semibold block text-[11px]">Alícuota Impositiva Vigente:</strong>
            <div className="font-bold text-zinc-900">General 16% (Art. 27 Ley del IVA)</div>
          </div>

          <div>
            <strong className="text-zinc-500 font-semibold block text-[11px]">Alícuota IGTF Divisas:</strong>
            <div className="font-bold text-purple-900">3.00% (Providencia SNAT/2022/000013)</div>
          </div>

          <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/80 mt-2">
            <span className="text-[11px] text-zinc-600 leading-relaxed block">
              ℹ️ Recuerda que los libros de compra y venta deben mantenerse actualizados al día en el establecimiento y estar disponibles ante cualquier fiscalización del SENIAT.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
