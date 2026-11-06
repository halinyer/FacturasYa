import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import {
  Sliders,
  Printer,
  RefreshCw,
  Check,
  AlertCircle,
  Activity,
  Lock,
  FileText,
  Utensils,
  X
} from 'lucide-react';

export default function FiscalConfigModal({ onClose, showToast }) {
  const {
    restaurantMode,
    toggleRestaurantMode,
    fiscalSettings,
    updateFiscalSettings,
    fiscalGetPorts,
    fiscalAutoDetectPort,
    fiscalPrintReportX,
    fiscalPrintReportZ,
    fiscalTestConnection,
    fiscalOpenLogFile
  } = useData() || {};

  const [fiscalPorts, setFiscalPorts] = useState([]);
  const [detectingPorts, setDetectingPorts] = useState(false);
  const [testingFiscal, setTestingFiscal] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [fiscalStatusInfo, setFiscalStatusInfo] = useState(null);
  const [printingFiscalZ, setPrintingFiscalZ] = useState(false);

  // Auto-detectar silenciosamente al abrir el modal para no obligar al usuario a pulsar botones
  useEffect(() => {
    let mounted = true;
    if (fiscalSettings?.enabled && fiscalAutoDetectPort) {
      setDetectingPorts(true);
      fiscalAutoDetectPort(fiscalSettings?.port)
        .then(res => {
          if (!mounted || !res) return;
          if (res.ports) setFiscalPorts(res.ports);
          if (res.success || (res.ports && res.ports.length > 0)) {
            setFiscalStatusInfo(res);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) setDetectingPorts(false);
        });
    }
    return () => { mounted = false; };
  }, []);

  const handleDetectPorts = async () => {
    setDetectingPorts(true);
    showToast('Escaneando puertos COM en busca de impresora HKA...', 'info');
    try {
      if (fiscalAutoDetectPort) {
        const res = await fiscalAutoDetectPort(fiscalSettings?.port);
        if (res && res.ports) {
          setFiscalPorts(res.ports);
        }
        const active = res?.activePort || res?.port;
        if (res && res.success && active) {
          setFiscalStatusInfo(res);
          showToast(`¡Impresora HKA detectada en ${active}!`, 'success');
        } else if (res && res.ports && res.ports.length > 0) {
          setFiscalStatusInfo(res);
          showToast(`Puertos detectados: ${res.ports.join(', ')}. Encienda la impresora fiscal.`, 'info');
        } else {
          showToast(res?.error || 'No se detectaron puertos seriales COM', 'info');
        }
      } else if (fiscalGetPorts) {
        const res = await fiscalGetPorts();
        if (res && res.ports) {
          setFiscalPorts(res.ports);
          showToast(`Puertos detectados: ${res.ports.join(', ') || 'Ninguno'}`, 'success');
        }
      }
    } catch (err) {
      showToast('Error al consultar puertos COM', 'error');
    } finally {
      setDetectingPorts(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    showToast('Comprobando conexión con la impresora...', 'info');
    try {
      if (fiscalTestConnection) {
        const res = await fiscalTestConnection(fiscalSettings?.port || 'COM2');
        setFiscalStatusInfo(res);
        if (res && res.success) {
          showToast(`¡Conexión OK en ${fiscalSettings?.port || 'COM2'}!`, 'success');
        } else {
          showToast(`Error: ${res?.error || 'Sin respuesta'}`, 'error');
        }
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleOpenFiscalLog = async () => {
    try {
      if (fiscalOpenLogFile) {
        const res = await fiscalOpenLogFile();
        if (res && res.success) {
          showToast('Abriendo registro_fiscal.log...', 'success');
        } else {
          showToast(res?.error || 'No se encontró el archivo de log aún.', 'info');
        }
      }
    } catch (err) {
      showToast(`Error abriendo log: ${err.message}`, 'error');
    }
  };

  const handleTestFiscalZ = async () => {
    if (!window.confirm('¿Confirmas emitir un Reporte Z en la impresora fiscal? Esto cerrará la jornada y reiniciará los contadores del día.')) return;
    setPrintingFiscalZ(true);
    showToast('Enviando comando Reporte Z a la impresora...', 'info');
    try {
      if (fiscalPrintReportZ) {
        const res = await fiscalPrintReportZ(fiscalSettings?.port || 'COM2');
        if (res && res.success) {
          showToast('¡Reporte Z emitido e impreso exitosamente!', 'success');
        } else {
          showToast(`Aviso Fiscal: ${res?.error || 'Sin respuesta'}`, 'error');
        }
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setPrintingFiscalZ(false);
    }
  };

  const handleTestFiscal = async () => {
    setTestingFiscal(true);
    showToast('Enviando Reporte X a la impresora fiscal...', 'info');
    try {
      if (fiscalPrintReportX) {
        const res = await fiscalPrintReportX();
        if (res && res.success) {
          showToast('¡Reporte X impreso con éxito!', 'success');
        } else {
          showToast(`Fallo fiscal: ${res?.error || 'Sin respuesta'}`, 'error');
        }
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setTestingFiscal(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '16px', padding: '24px',
        maxWidth: '460px', width: '90%', border: '1px solid #eaedf2',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)', color: '#111827'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: '800' }}>
            <Sliders size={20} color="#2563eb" /> Configuración del Sistema
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.86rem', color: '#6b7280', margin: '0 0 20px 0', lineHeight: '1.4' }}>
          Personaliza el tipo de negocio y activa módulos avanzados según el establecimiento.
        </p>

        {/* Fiscal Printer SENIAT Card */}
        <div style={{
          background: fiscalSettings?.enabled ? '#f0fdf4' : '#f8fafc',
          border: `1.5px solid ${fiscalSettings?.enabled ? '#86efac' : '#e2e8f0'}`,
          borderRadius: '14px', padding: '16px', marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ paddingRight: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '0.95rem', color: fiscalSettings?.enabled ? '#166534' : '#1e293b' }}>
                <Printer size={18} color={fiscalSettings?.enabled ? '#16a34a' : '#64748b'} /> Impresora Fiscal SENIAT (HKA80)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                Emisión automática de facturas con IGTF (3%) y reportes diarios Z y X.
              </div>
            </div>

            {/* Toggle switch */}
            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px', flexShrink: 0, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!fiscalSettings?.enabled}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  updateFiscalSettings({ enabled: isChecked });
                  showToast(isChecked ? 'Impresora Fiscal activada' : 'Impresora Fiscal desactivada', 'success');
                }}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: fiscalSettings?.enabled ? '#16a34a' : '#cbd5e1',
                transition: '0.2s', borderRadius: '28px'
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '22px', width: '22px',
                  left: fiscalSettings?.enabled ? '25px' : '3px', bottom: '3px',
                  backgroundColor: 'white', transition: '0.2s', borderRadius: '50%',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </span>
            </label>
          </div>

          {fiscalSettings?.enabled && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #dcfce7', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#374151', minWidth: '85px' }}>Puerto COM:</label>
                <select
                  value={fiscalSettings?.port || 'COM2'}
                  onChange={(e) => {
                    updateFiscalSettings({ port: e.target.value });
                    showToast(`Puerto cambiado a ${e.target.value}`, 'success');
                  }}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: '8px',
                    border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: '700',
                    background: '#ffffff', color: '#0f172a'
                  }}
                >
                  {Array.from(new Set([
                    fiscalSettings?.port || 'COM2',
                    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8',
                    ...(fiscalPorts || [])
                  ])).filter(Boolean).map(p => (
                    <option key={p} value={p}>
                      {p} {p === 'COM2' ? '(Emulador HKA)' : ''} {p === (fiscalStatusInfo?.activePort || fiscalStatusInfo?.port) ? '⭐ (Detectada)' : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleDetectPorts}
                  disabled={detectingPorts}
                  title="Escanea todos los puertos COM buscando la impresora fiscal HKA"
                  style={{
                    padding: '6px 12px', background: '#0284c7', color: '#ffffff', border: 'none',
                    borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                    fontSize: '0.78rem', fontWeight: '700'
                  }}
                >
                  <RefreshCw size={14} className={detectingPorts ? 'spin' : ''} />
                  {detectingPorts ? 'Buscando...' : 'Auto-detectar'}
                </button>
              </div>

              {fiscalStatusInfo && (
                <div style={{
                  background: fiscalStatusInfo.success ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${fiscalStatusInfo.success ? '#86efac' : '#fca5a5'}`,
                  borderRadius: '8px', padding: '9px 12px', fontSize: '0.74rem',
                  color: fiscalStatusInfo.success ? '#166534' : '#991b1b'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: '800', marginBottom: '3px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {fiscalStatusInfo.success ? <Check size={14} color="#16a34a" /> : <AlertCircle size={14} color="#dc2626" />}
                      {fiscalStatusInfo.success ? `Impresora HKA Conectada (${fiscalSettings?.port || 'COM2'})` : `Impresora no responde en ${fiscalSettings?.port || 'COM2'}`}
                    </span>
                    <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: fiscalStatusInfo.success ? '#dcfce7' : '#fee2e2' }}>
                      {fiscalStatusInfo.success ? 'EN LÍNEA' : 'OFFLINE'}
                    </span>
                  </div>
                  <div style={{ lineHeight: '1.4', marginTop: '2px' }}>
                    {fiscalStatusInfo.success ? (
                      <>
                        • Estado: <strong>{fiscalStatusInfo.status?.status_desc || 'Lista'}</strong><br/>
                        • Papel: <strong>{fiscalStatusInfo.status?.has_paper ? 'Correcto ✅' : 'SIN PAPEL ❌'}</strong><br/>
                        {fiscalStatusInfo.s1?.rif ? <span>• RIF Fiscal: <strong>{fiscalStatusInfo.s1.rif}</strong> | Últ. Factura: <strong>#{fiscalStatusInfo.s1.last_invoice_number}</strong><br/></span> : null}
                      </>
                    ) : (
                      <div>{fiscalStatusInfo.error || 'Verifique que la impresora esté encendida, el cable USB conectado y el puerto correcto seleccionado.'}</div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  title="Verifica conexión, estado de papel y RIF"
                  style={{
                    padding: '8px 6px', background: '#e0f2fe', color: '#0369a1',
                    border: '1px solid #bae6fd', borderRadius: '8px', fontWeight: '700', fontSize: '0.75rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                  }}
                >
                  <Activity size={13} />
                  {testingConnection ? 'Probando...' : 'Diagnóstico'}
                </button>

                <button
                  type="button"
                  onClick={handleTestFiscal}
                  disabled={testingFiscal}
                  title="Emite un Reporte X oficial"
                  style={{
                    padding: '8px 6px', background: '#16a34a', color: '#ffffff',
                    border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.75rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                  }}
                >
                  <Printer size={13} />
                  {testingFiscal ? 'Imprimiendo...' : 'Reporte X'}
                </button>

                <button
                  type="button"
                  onClick={handleTestFiscalZ}
                  disabled={printingFiscalZ}
                  title="Emite un Reporte Z oficial (Cierre fiscal)"
                  style={{
                    padding: '8px 6px', background: '#dc2626', color: '#ffffff',
                    border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.75rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                  }}
                >
                  <Lock size={13} />
                  {printingFiscalZ ? 'Cerrando Z...' : 'Reporte Z'}
                </button>

                <button
                  type="button"
                  onClick={handleOpenFiscalLog}
                  title="Abre la bitácora de eventos registro_fiscal.log en el pendrive"
                  style={{
                    padding: '8px 6px', background: '#f1f5f9', color: '#334155',
                    border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', fontSize: '0.75rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                  }}
                >
                  <FileText size={13} />
                  Ver Log
                </button>
              </div>

              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                padding: '8px 10px', fontSize: '0.71rem', color: '#475569', lineHeight: 1.4
              }}>
                <strong>💡 Tips para la PC del Cliente:</strong>
                <div style={{ marginTop: '2px' }}>
                  • Conecte la impresora HKA por USB y pulse <strong>Auto-detectar</strong>.<br/>
                  • Si da algún error, pulse <strong>Ver Log</strong> para ver la causa exacta en el pendrive.<br/>
                  • En esta PC de desarrollo, use <strong>COM2</strong> con el emulador encendido.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Restaurant Mode Switch Card */}
        <div style={{
          background: restaurantMode ? '#eff6ff' : '#f8fafc',
          border: `1.5px solid ${restaurantMode ? '#3b82f6' : '#e2e8f0'}`,
          borderRadius: '14px', padding: '16px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ paddingRight: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '0.95rem', color: restaurantMode ? '#1e40af' : '#1e293b' }}>
              <Utensils size={18} color={restaurantMode ? '#2563eb' : '#64748b'} /> Modo Restaurante y Comandas
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
              Habilita el servidor Wi-Fi local para tablets de meseros, comandas y gestión de mesas en sala.
            </div>
          </div>

          <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px', flexShrink: 0, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!restaurantMode}
              onChange={(e) => {
                const isChecked = e.target.checked;
                toggleRestaurantMode(isChecked);
                showToast(isChecked ? 'Modo Restaurante activado' : 'Modo Restaurante desactivado', 'success');
              }}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: restaurantMode ? '#2563eb' : '#cbd5e1',
              transition: '0.2s', borderRadius: '28px'
            }}>
              <span style={{
                position: 'absolute', content: '""', height: '22px', width: '22px',
                left: restaurantMode ? '25px' : '3px', bottom: '3px',
                backgroundColor: 'white', transition: '0.2s', borderRadius: '50%',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '9px 20px', background: '#0f172a', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: '700', cursor: 'pointer', fontSize: '0.88rem' }}
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
