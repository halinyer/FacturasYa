import React, { useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { Database, Download, Upload, X } from 'lucide-react';

export default function BackupModal({ onClose, showToast }) {
  const { exportBackup, importBackup } = useData() || {};
  const fileInputRef = useRef(null);

  const handleExport = () => {
    try {
      const json = exportBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `respaldo_facturapos_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('¡Copia de seguridad descargada exitosamente!', 'success');
    } catch (err) {
      showToast('Error al exportar los datos', 'error');
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const res = importBackup(text);
        showToast(`¡Respaldo restaurado con éxito! (${res.count} facturas recuperadas)`, 'success');
        onClose();
      } catch (err) {
        showToast(err.message || 'Error al procesar el archivo de respaldo', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '16px', padding: '24px',
        maxWidth: '440px', width: '90%', border: '1px solid #eaedf2',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)', color: '#111827'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', fontWeight: '800' }}>
            <Database size={20} color="#f59e0b" /> Copias de Seguridad (Offline)
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
          Protege tus facturas, productos, fotos y cuentas por cobrar guardando un archivo en tu computadora o en una memoria USB.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            type="button"
            onClick={handleExport}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px', background: '#fef3c7', border: '1.5px solid #fde68a',
              color: '#b45309', borderRadius: '12px', fontWeight: '800', cursor: 'pointer',
              fontSize: '0.92rem'
            }}
          >
            <Download size={18} /> Descargar Respaldo Ahora (.json)
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => {
              if (window.confirm('⚠️ Atención: Al restaurar un respaldo se sobrescribirán los datos actuales con el contenido del archivo. ¿Deseas continuar?')) {
                fileInputRef.current?.click();
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px', background: '#f3f4f6', border: '1px solid #d1d5db',
              color: '#374151', borderRadius: '12px', fontWeight: '700', cursor: 'pointer',
              fontSize: '0.92rem'
            }}
          >
            <Upload size={18} /> Restaurar desde Archivo (.json)
          </button>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#4b5563', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
