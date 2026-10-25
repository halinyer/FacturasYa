const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { app } = require('electron');

let defaultPort = 'COM2';

/**
 * Resuelve y auto-repara (Self-Healing) el ejecutable binario autónomo bridge_fiscal.exe.
 * - Protege contra el borrado automático de carpetas temporales (%TEMP%) de Windows en modo Portable.
 * - Si el archivo externo fue borrado accidentalmente o por limpiadores del sistema, lo restaura
 *   automáticamente leyendo la copia sellada dentro de app.asar (bin/bridge_fiscal.exe).
 */
function getBridgeExePath() {
  const diskCandidates = [];

  // Ubicación persistente segura fuera de %TEMP% (AppData/Roaming/facturacion-pos/bin/bridge_fiscal.exe)
  let persistentBinPath = null;
  try {
    if (app && typeof app.getPath === 'function') {
      const userDataDir = app.getPath('userData');
      if (userDataDir) {
        persistentBinPath = path.join(userDataDir, 'bin', 'bridge_fiscal.exe');
      }
    }
  } catch (e) {}

  if (app && app.isPackaged) {
    // 1. En resources/ (configuración extraResources de electron-builder)
    if (process.resourcesPath) {
      diskCandidates.push(path.join(process.resourcesPath, 'bridge_fiscal.exe'));
      diskCandidates.push(path.join(process.resourcesPath, 'bin', 'bridge_fiscal.exe'));
      diskCandidates.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'bridge_fiscal.exe'));
    }
    // 2. Junto al ejecutable FacturaPOS.exe en el pendrive
    if (process.execPath) {
      const execDir = path.dirname(process.execPath);
      diskCandidates.push(path.join(execDir, 'bridge_fiscal.exe'));
      diskCandidates.push(path.join(execDir, 'resources', 'bridge_fiscal.exe'));
    }
    if (persistentBinPath) {
      diskCandidates.push(persistentBinPath);
    }
  } else {
    // 3. Entorno de desarrollo local
    diskCandidates.push(path.resolve(__dirname, '..', 'bin', 'bridge_fiscal.exe'));
    diskCandidates.push(path.resolve(__dirname, '..', 'dist', 'bridge_fiscal.exe'));
    diskCandidates.push(path.resolve(__dirname, '..', 'fiscal_service', 'dist', 'bridge_fiscal.exe'));
    diskCandidates.push(path.resolve(__dirname, '..', 'bridge_fiscal.exe'));
    if (persistentBinPath) {
      diskCandidates.push(persistentBinPath);
    }
  }

  for (const candidate of diskCandidates) {
    try {
      if (fs.existsSync(candidate) && !candidate.includes('app.asar' + path.sep)) {
        // Si estamos en modo empaquetado y aún no existe copia de respaldo en userData/bin, crearla preventivamente
        if (persistentBinPath && candidate !== persistentBinPath && !fs.existsSync(persistentBinPath)) {
          try {
            fs.mkdirSync(path.dirname(persistentBinPath), { recursive: true });
            fs.copyFileSync(candidate, persistentBinPath);
          } catch (copyErr) {}
        }
        return candidate;
      }
    } catch (e) {}
  }

  // AUTO-REPARACIÓN (SELF-HEALING):
  // Si el archivo externo fue borrado (por limpiador de %TEMP% de Windows o borrado accidental),
  // extraemos la copia sellada dentro de app.asar (bin/bridge_fiscal.exe) hacia una ruta persistente.
  const asarEmbeddedSource = path.join(__dirname, '..', 'bin', 'bridge_fiscal.exe');
  try {
    if (fs.existsSync(asarEmbeddedSource)) {
      const binaryBuffer = fs.readFileSync(asarEmbeddedSource);
      const restoreTargets = [
        persistentBinPath,
        process.resourcesPath ? path.join(process.resourcesPath, 'bridge_fiscal.exe') : null
      ].filter(Boolean);

      for (const target of restoreTargets) {
        try {
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, binaryBuffer);
          console.log(`[Fiscal Bridge Self-Heal] bridge_fiscal.exe restaurado automáticamente en: ${target}`);
          return target;
        } catch (restoreErr) {
          console.warn(`[Fiscal Bridge Self-Heal] No se pudo restaurar en ${target}:`, restoreErr.message);
        }
      }
    }
  } catch (healErr) {
    console.error('[Fiscal Bridge Self-Heal Error]:', healErr.message);
  }

  return diskCandidates[0] || path.resolve(__dirname, '..', 'bin', 'bridge_fiscal.exe');
}

/**
 * Resuelve la ruta del archivo de log para que se guarde directamente en el pendrive / carpeta de la app.
 */
function getLogFilePath() {
  try {
    if (app && app.isPackaged && process.execPath) {
      const execDir = path.dirname(process.execPath);
      return path.join(execDir, 'registro_fiscal.log');
    }
    if (app && typeof app.getPath === 'function') {
      const userData = app.getPath('userData');
      if (userData) return path.join(userData, 'registro_fiscal.log');
    }
  } catch (e) {}
  return path.resolve(__dirname, '..', 'registro_fiscal.log');
}

/**
 * Resuelve la ruta del script fiscalBridge.ps1 (interfaz directa con TfhkaNet.dll).
 */
function getPsBridgePath() {
  const diskCandidates = [];
  if (app && app.isPackaged) {
    if (process.resourcesPath) {
      diskCandidates.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'fiscalBridge.ps1'));
      diskCandidates.push(path.join(process.resourcesPath, 'fiscalBridge.ps1'));
    }
  }
  diskCandidates.push(path.resolve(__dirname, 'fiscalBridge.ps1'));
  diskCandidates.push(path.resolve(__dirname, '..', 'electron', 'fiscalBridge.ps1'));

  for (const candidate of diskCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.resolve(__dirname, 'fiscalBridge.ps1');
}

/**
 * Ejecuta fiscalBridge.ps1 para operaciones directas del SDK TfhkaNet.dll (Memoria Fiscal, Reportes Z, etc.)
 */
function runPsBridge(action, options = {}, timeoutMs = 25000) {
  return new Promise((resolve) => {
    const psScript = getPsBridgePath();
    const port = options.port || defaultPort || 'COM2';
    const args = [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', psScript,
      '-Action', action,
      '-Port', port
    ];

    if (options.startDate) {
      args.push('-StartDate', String(options.startDate));
    }
    if (options.endDate) {
      args.push('-EndDate', String(options.endDate));
    }
    if (options.startZ) {
      args.push('-StartZ', String(options.startZ));
    }
    if (options.endZ) {
      args.push('-EndZ', String(options.endZ));
    }

    execFile(
      'powershell.exe',
      args,
      {
        windowsHide: true,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf-8'
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`[PS Fiscal Bridge ${action} Error]:`, error.message);
          return resolve({
            success: false,
            error: error.killed ? 'Timeout al consultar la memoria fiscal de la máquina.' : error.message
          });
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (jsonErr) {
          console.error(`[PS Fiscal Bridge JSON Error]:`, stdout);
          resolve({
            success: false,
            error: `Respuesta inválida al consultar memoria fiscal: ${stdout.slice(0, 150)}`
          });
        }
      }
    );
  });
}

/**
 * Ejecuta el binario autónomo bridge_fiscal.exe pasando argumentos y parseando la salida JSON.
 */
function runBridge(args, timeoutMs = 35000) {
  return new Promise((resolve) => {
    const bridgeExe = getBridgeExePath();
    const logPath = getLogFilePath();

    if (!fs.existsSync(bridgeExe)) {
      console.error(`[Fiscal Bridge] Binario no encontrado en: ${bridgeExe}`);
      return resolve({
        success: false,
        error: `No se encontró el ejecutable bridge_fiscal.exe en: ${bridgeExe}`
      });
    }

    const fullArgs = [...args, '--log-file', logPath];

    execFile(
      bridgeExe,
      fullArgs,
      {
        windowsHide: true,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf-8'
      },
      (error, stdout, stderr) => {
        if (stderr && stderr.trim().length > 0) {
          console.log(`[Fiscal Bridge Log]\n${stderr.trim()}`);
        }

        if (error) {
          console.error('[Fiscal Bridge Error]:', error.message);
          if (stdout && stdout.trim().length > 0) {
            try {
              const parsed = JSON.parse(stdout.trim());
              return resolve(parsed);
            } catch (pe) {}
          }
          return resolve({
            success: false,
            error: error.killed
              ? 'La impresora fiscal no respondió en el tiempo límite (Timeout)'
              : `Error ejecutando bridge_fiscal: ${error.message}`
          });
        }

        if (!stdout || stdout.trim().length === 0) {
          return resolve({
            success: false,
            error: 'El servicio fiscal no retornó respuesta.'
          });
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          if (parsed && parsed.activePort) {
            defaultPort = parsed.activePort;
          }
          resolve(parsed);
        } catch (jsonErr) {
          console.error('[Fiscal Bridge JSON Parse Error]:', jsonErr.message, 'Output:', stdout);
          resolve({
            success: false,
            error: `Respuesta fiscal no válida: ${stdout.slice(0, 200)}`
          });
        }
      }
    );
  });
}

const fiscalService = {
  setDefaultPort: (p) => { if (p) defaultPort = p; },
  getDefaultPort: () => defaultPort,

  ensureRunning: async () => true, // Con CLI standalone no requiere servidor corriendo en background

  getPorts: async () => {
    return await runBridge(['--action', 'scan'], 8000);
  },

  autoDetectPort: async (preferredPort) => {
    const res = await runBridge(['--action', 'scan'], 12000);
    if (res && res.success && res.activePort) {
      defaultPort = res.activePort;
      return {
        success: true,
        port: res.activePort,
        activePort: res.activePort,
        ports: res.ports || [res.activePort],
        status: res.status
      };
    }
    return {
      success: false,
      ports: res?.ports || [],
      error: res?.error || 'No se detectó ninguna impresora fiscal HKA respondiendo en los puertos COM.'
    };
  },

  testConnection: async (port) => {
    const targetPort = port || defaultPort || 'COM2';
    const res = await runBridge(['--action', 'test', '--port', targetPort], 10000);
    if (res && res.success) {
      defaultPort = targetPort;
    }
    return res;
  },

  getS1Status: async (port) => {
    const targetPort = port || defaultPort || 'COM2';
    return await runBridge(['--action', 's1', '--port', targetPort], 10000);
  },

  getAuditStatus: async (port) => {
    const targetPort = port || defaultPort || 'COM2';
    return await runBridge(['--action', 'audit', '--port', targetPort], 15000);
  },

  printReportX: async (port) => {
    const targetPort = port || defaultPort || 'COM2';
    return await runBridge(['--action', 'report-x', '--port', targetPort], 35000);
  },

  printReportZ: async (port) => {
    const targetPort = port || defaultPort || 'COM2';
    return await runBridge(['--action', 'report-z', '--port', targetPort], 45000);
  },

  cancelInvoice: async (port) => {
    const targetPort = port || defaultPort || 'COM2';
    return await runBridge(['--action', 'cancel', '--port', targetPort], 12000);
  },

  getFiscalLog: async () => {
    return await runBridge(['--action', 'get-log'], 6000);
  },

  getFiscalMemory: async (port, options = {}) => {
    const targetPort = port || defaultPort || 'COM2';
    return await runPsBridge('getFiscalMemory', { ...options, port: targetPort }, 30000);
  },

  printFiscalMemory: async (port, options = {}) => {
    const targetPort = port || defaultPort || 'COM2';
    return await runPsBridge('printFiscalMemory', { ...options, port: targetPort }, 35000);
  },

  printInvoice: async (port, invoiceData) => {
    const targetPort = port || defaultPort || 'COM2';
    
    // Guardar payload en archivo temporal para evitar límites de longitud en CLI de Windows
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `fiscal_inv_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
    
    try {
      fs.writeFileSync(tempFilePath, JSON.stringify(invoiceData), 'utf-8');
      const res = await runBridge(['--action', 'invoice', '--port', targetPort, '--file', tempFilePath], 65000);
      return res;
    } finally {
      // Limpiar archivo temporal
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanErr) {}
    }
  },

  shutdown: async () => {}
};

module.exports = fiscalService;
