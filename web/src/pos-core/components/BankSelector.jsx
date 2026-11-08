import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check, Landmark, Sparkles } from 'lucide-react';
import { VZLA_BANKS, BankLogo, findBank } from '../utils/venezuelaBanks';

// Bancos de mayor volumen transaccional en Venezuela para acceso rápido en 1 click
const POPULAR_BANK_CODES = ['0102', '0134', '0105', '0172', '0108', '0191'];

export default function BankSelector({
  selectedBank = '',
  onSelectBank,
  placeholder = 'Seleccionar banco receptor...',
  showQuickChips = true,
  compact = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Resolver banco actual seleccionado
  const currentBank = useMemo(() => {
    if (!selectedBank) return null;
    return findBank(selectedBank);
  }, [selectedBank]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filtrado de bancos por código o nombre
  const filteredBanks = useMemo(() => {
    if (!search.trim()) return VZLA_BANKS;
    const q = search.trim().toLowerCase();
    return VZLA_BANKS.filter(
      (b) =>
        b.code.includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.shortName.toLowerCase().includes(q)
    );
  }, [search]);

  // Lista de bancos populares resueltos
  const popularBanks = useMemo(() => {
    return POPULAR_BANK_CODES.map((code) => findBank(code)).filter(Boolean);
  }, []);

  const handleSelect = (bank) => {
    if (onSelectBank) {
      // Formato unificado estándar: "0134 - Banesco"
      onSelectBank(`${bank.code} - ${bank.name}`);
    }
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onSelectBank) onSelectBank('');
  };

  return (
    <div ref={containerRef} className={`relative w-full text-zinc-900 ${className}`}>
      {/* Botón Trigger Selector */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 transition-all cursor-pointer text-left ${
          compact ? 'p-2 rounded-lg text-xs' : 'p-2.5 rounded-xl text-sm'
        } ${
          currentBank
            ? 'border bg-white shadow-xs'
            : 'border border-zinc-200 bg-white hover:bg-zinc-50/80 shadow-xs'
        } ${isOpen ? 'ring-2 ring-zinc-900/10 border-zinc-400' : 'border-zinc-300'}`}
        style={{
          borderColor: currentBank ? currentBank.borderColor : undefined,
          backgroundColor: currentBank ? currentBank.bg : undefined
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden flex-1">
          {currentBank ? (
            <>
              <BankLogo code={currentBank.code} size={compact ? 24 : 28} />
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded text-white shrink-0 tracking-wider"
                  style={{ backgroundColor: currentBank.color }}
                >
                  {currentBank.code}
                </span>
                <span className="font-bold text-xs sm:text-[13px] text-zinc-900 truncate">
                  {currentBank.name}
                </span>
              </div>
            </>
          ) : (
            <>
              <div
                className={`rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0 ${
                  compact ? 'w-6 h-6' : 'w-7 h-7'
                }`}
              >
                <Landmark size={compact ? 13 : 15} />
              </div>
              <span className="text-zinc-500 text-xs sm:text-[13px] font-medium truncate">
                {placeholder}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {currentBank && (
            <span
              onClick={handleClear}
              title="Quitar banco seleccionado"
              className="w-5 h-5 rounded-full bg-zinc-200/80 hover:bg-zinc-300 flex items-center justify-center text-zinc-600 transition-colors"
            >
              <X size={12} strokeWidth={2.5} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-zinc-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-zinc-900' : ''
            }`}
          />
        </div>
      </button>

      {/* Chips Rápidos de Bancos Más Utilizados en Venezuela */}
      {showQuickChips && !compact && (
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 scrollbar-none">
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider shrink-0 mr-0.5">
            Frecuentes:
          </span>
          {popularBanks.map((bank) => {
            const isSelected = currentBank?.code === bank.code;
            return (
              <button
                key={bank.code}
                type="button"
                onClick={() => handleSelect(bank)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'shadow-xs border-zinc-900 text-zinc-950 font-black'
                    : 'bg-white hover:bg-zinc-100/90 text-zinc-700 border-zinc-200'
                }`}
                style={{
                  backgroundColor: isSelected ? bank.bg : undefined,
                  borderColor: isSelected ? bank.color : undefined
                }}
              >
                <BankLogo code={bank.code} size={16} />
                <span>{bank.shortName}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Desplegable Flotante con Buscador y Todos los Bancos */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[340px]">
          {/* Barra de búsqueda */}
          <div className="p-2.5 border-b border-zinc-100 bg-zinc-50/70 flex items-center gap-2 shrink-0">
            <Search size={15} className="text-zinc-600 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por código (0102, 0134...) o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-hidden text-xs font-semibold text-zinc-900 placeholder:text-zinc-600"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-zinc-600 hover:text-zinc-800 p-1 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Lista de bancos filtrados */}
          <div className="overflow-y-auto p-1.5 divide-y divide-zinc-50 space-y-0.5">
            {filteredBanks.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-zinc-600">
                No se encontró ningún banco con "{search}"
              </div>
            ) : (
              filteredBanks.map((b) => {
                const isSelected = currentBank?.code === b.code;
                return (
                  <div
                    key={b.code}
                    onClick={() => handleSelect(b)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'border'
                        : 'hover:bg-zinc-100/80 border border-transparent'
                    }`}
                    style={{
                      backgroundColor: isSelected ? b.bg : undefined,
                      borderColor: isSelected ? b.borderColor : undefined
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BankLogo code={b.code} size={28} />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono font-black text-[10px] px-1.5 py-0.2 rounded text-white tracking-wider"
                            style={{ backgroundColor: b.color }}
                          >
                            {b.code}
                          </span>
                          <span className="font-bold text-xs text-zinc-900 truncate">
                            {b.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-600">
                          {b.shortName} • Código Bancario {b.code}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 ml-2"
                        style={{ backgroundColor: b.color }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
