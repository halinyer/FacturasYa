import React from 'react';
import { Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { formatVE, getFiscalCompanyProfile } from '../../utils/seniatCsvExporter';

export default function TaxSummaryForma30({
  taxSummary = {},
  onExportExcel,
  onExportResumen,
  selectedMonth = '10',
  selectedYear = '2026',
  selectedFortnight = 'all',
  salesTotals = {},
  zReportsTotals = {},
  purchasesTotals = {}
}) {
  const companyProfile = getFiscalCompanyProfile();

  const monthNames = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
  };

  const periodTitle = `${monthNames[String(selectedMonth).padStart(2, '0')] || selectedMonth} ${selectedYear} (${
    selectedFortnight === 'all' ? 'Mes Completo' : selectedFortnight === 'q1' ? '1ra Quincena' : '2da Quincena'
  })`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Tarjeta de Autoliquidación del Mes */}
      <div className="lg:col-span-7 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                <FileSpreadsheet size={16} />
              </span>
              <h3 className="text-base font-extrabold text-zinc-950">
                Autoliquidación del IVA (Forma 30 SENIAT)
              </h3>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Período: <strong className="text-zinc-700">{periodTitle}</strong> · Base Legal: Ley del IVA y Providencia SNAT/2011/00071
            </p>
          </div>

          {onExportExcel ? (
            <button
              type="button"
              onClick={onExportExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98 shrink-0"
              title="Descargar libro en formato Excel (.xlsx) con 3 hojas interconectadas (COMPRAS, VENTAS, RESUMEN)"
            >
              <Download size={14} />
              <span>Exportar Libro Excel (.xlsx)</span>
            </button>
          ) : onExportResumen ? (
            <button
              type="button"
              onClick={onExportResumen}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98 shrink-0"
              title="Descargar plantilla oficial CSV de Resumen de Compra y Ventas para el contador"
            >
              <Download size={14} />
              <span>Exportar Plantilla Resumen CSV</span>
            </button>
          ) : null}
        </div>

        <div className="space-y-3 text-xs">
          {/* Débito Fiscal */}
          <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2">
            <div className="flex justify-between items-center font-bold text-amber-950">
              <span className="flex items-center gap-1.5">
                <span>(+) Débito Fiscal Generado (Ventas):</span>
              </span>
              <span className="font-mono font-black text-amber-900 text-sm">
                Bs. {formatVE(taxSummary.debitoFiscal || 0)}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-500 border-t border-amber-100 pt-1.5">
              <span>Base Imponible Gravada 16%: Bs. {formatVE(zReportsTotals?.baseGeneral16Bs || salesTotals?.taxableBaseBs || 0)}</span>
              <span>Exentas: Bs. {formatVE(zReportsTotals?.exemptSalesBs || salesTotals?.exemptBs || 0)}</span>
            </div>
          </div>

          {/* Crédito Fiscal */}
          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-2">
            <div className="flex justify-between items-center font-bold text-emerald-950">
              <span className="flex items-center gap-1.5">
                <span>(-) Crédito Fiscal Deducible (Compras):</span>
              </span>
              <span className="font-mono font-black text-emerald-900 text-sm">
                Bs. {formatVE(taxSummary.creditoFiscal || 0)}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-500 border-t border-emerald-100 pt-1.5">
              <span>Base Imponible Compras 16%: Bs. {formatVE(purchasesTotals?.taxableBaseBs || 0)}</span>
              <span>Exentas: Bs. {formatVE(purchasesTotals?.exemptAmountBs || 0)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-zinc-200 my-2" />

          {/* Cuota Tributaria o Saldo a Favor */}
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

          {/* IGTF Divisas */}
          <div className="flex justify-between items-center p-3 bg-purple-50/60 rounded-xl border border-purple-100">
            <div>
              <span className="font-bold text-purple-900 block">(+) IGTF 3% Percibido en Divisas:</span>
              <span className="text-[11px] text-purple-700">Obligación independiente al débito fiscal</span>
            </div>
            <span className="font-mono font-bold text-purple-900 text-sm">Bs. {formatVE(taxSummary.igtfTotal || 0)}</span>
          </div>

          {/* Total Global */}
          <div className="flex justify-between items-center p-4 bg-zinc-950 text-white rounded-xl shadow-xs">
            <span className="font-bold text-xs uppercase tracking-wider">TOTAL A ENTERAR AL SENIAT (IVA + IGTF):</span>
            <span className="font-mono font-black text-lg text-emerald-400">
              Bs. {formatVE(taxSummary.totalPagarSeniat || 0)}
            </span>
          </div>

          {onExportExcel ? (
            <div className="space-y-1.5 mt-2">
              <button
                type="button"
                onClick={onExportExcel}
                className="w-full py-3 px-4 rounded-xl border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
                title="Descargar libro en formato Excel (.xlsx) con 3 hojas interconectadas (COMPRAS, VENTAS, RESUMEN)"
              >
                <Download size={15} />
                <span>Descargar Plantilla Oficial Excel (.xlsx) [3 Hojas]</span>
              </button>
              {onExportResumen && (
                <button
                  type="button"
                  onClick={onExportResumen}
                  className="w-full py-1 text-center text-zinc-400 hover:text-zinc-700 text-[10px] font-semibold transition-colors cursor-pointer"
                >
                  O descargar como archivo CSV plano ("COMPRA VENTAS - Resumen.csv")
                </button>
              )}
            </div>
          ) : onExportResumen ? (
            <button
              type="button"
              onClick={onExportResumen}
              className="mt-2 w-full py-2.5 px-4 rounded-xl border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Download size={14} className="text-emerald-700" />
              <span>Descargar Archivo Oficial: "COMPRA VENTAS - Resumen.csv"</span>
            </button>
          ) : null}
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
            <div className="font-bold text-zinc-950 text-sm">{companyProfile.legalName}</div>
          </div>

          <div>
            <strong className="text-zinc-500 font-semibold block text-[11px]">RIF:</strong>
            <div className="font-mono font-bold text-zinc-900">{companyProfile.rif}</div>
          </div>

          <div>
            <strong className="text-zinc-500 font-semibold block text-[11px]">Tipo de Contribuyente:</strong>
            <div className="font-semibold text-zinc-800">{companyProfile.taxpayerType}</div>
          </div>

          <div>
            <strong className="text-zinc-500 font-semibold block text-[11px]">Dirección Fiscal:</strong>
            <div className="text-zinc-700 leading-relaxed">
              {companyProfile.fiscalAddress}
            </div>
          </div>

          <div>
            <strong className="text-zinc-500 font-semibold block text-[11px]">Serial Máquina Fiscal HKA80:</strong>
            <div className="font-mono font-bold text-zinc-900">{companyProfile.machineNumber}</div>
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
              ℹ️ Los libros de compra y venta y el resumen mensual deben coincidir exactamente con la declaración de la Forma 30 en el portal del SENIAT.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
