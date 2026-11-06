import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check, Landmark } from 'lucide-react';
import { VZLA_BANKS, BankLogo, findBank } from '../../utils/venezuelaBanks';

const BankSelector = ({
  selectedBank = '',
  onSelectBank,
  placeholder = 'Seleccionar banco receptor...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Resolver banco seleccionado actualmente
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
      // Auto enfocar el buscador al abrir
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filtrar bancos por nombre o número de código (ej: 0102, 0134)
  const filteredBanks = useMemo(() => {
    if (!search.trim()) return VZLA_BANKS;
    const q = search.trim().toLowerCase();
    return VZLA_BANKS.filter(b => 
      b.code.includes(q) ||
      b.name.toLowerCase().includes(q) ||
      b.shortName.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelect = (bank) => {
    if (onSelectBank) {
      // Formato unificado: "0134 - Banesco"
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
    <div ref={containerRef} style={{ position: 'relative', width: '100%', fontFamily: 'inherit' }}>
      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 12px',
          background: currentBank ? currentBank.bg : '#ffffff',
          border: currentBank ? `1.5px solid ${currentBank.color}` : '1.5px solid #cbd5e1',
          borderRadius: '12px',
          cursor: 'pointer',
          boxSizing: 'border-box',
          transition: 'all 0.16s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : '0 1px 2px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, overflow: 'hidden' }}>
          {currentBank ? (
            <>
              <BankLogo code={currentBank.code} size={28} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span style={{
                  background: currentBank.color,
                  color: '#ffffff',
                  fontWeight: '800',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  letterSpacing: '0.5px'
                }}>
                  {currentBank.code}
                </span>
                <span style={{
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {currentBank.name}
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b'
              }}>
                <Landmark size={16} />
              </div>
              <span style={{ color: '#64748b', fontSize: '0.86rem', fontWeight: '500' }}>
                {placeholder}
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {currentBank && (
            <span
              onClick={handleClear}
              title="Quitar banco"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.08)',
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              <X size={12} strokeWidth={2.5} />
            </span>
          )}
          <ChevronDown
            size={18}
            style={{
              color: '#64748b',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease'
            }}
          />
        </div>
      </button>

      {/* Floating Dropdown List */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.18), 0 4px 10px -2px rgba(0, 0, 0, 0.08)',
          zIndex: 3500,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Search bar inside dropdown */}
          <div style={{
            padding: '10px',
            borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Search size={16} color="#94a3b8" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por código (0102, 0134...) o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.84rem',
                fontWeight: '600',
                color: '#0f172a'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '2px'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Banks list */}
          <div style={{
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '6px'
          }}>
            {filteredBanks.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>
                No se encontró ningún banco con "{search}"
              </div>
            ) : (
              filteredBanks.map((b) => {
                const isSelected = currentBank && currentBank.code === b.code;
                return (
                  <div
                    key={b.code}
                    onClick={() => handleSelect(b)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isSelected ? b.bg : 'transparent',
                      transition: 'background 0.12s ease',
                      marginBottom: '2px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <BankLogo code={b.code} size={28} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: '900',
                            fontSize: '0.8rem',
                            color: b.color,
                            background: b.bg,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            border: `1px solid ${b.borderColor}`
                          }}>
                            {b.code}
                          </span>
                          <span style={{ fontWeight: '800', fontSize: '0.86rem', color: '#0f172a' }}>
                            {b.name}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {b.shortName} • Código Bancario {b.code}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: b.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}>
                        <Check size={14} strokeWidth={3} />
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
};

export default BankSelector;
