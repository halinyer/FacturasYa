const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Crucial: Single instance lock prevents two apps from running and locking files / ports
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// Crucial for Windows 10/11: Disable hardware acceleration and GPU flags
// Prevents GPU process compositor crashes/hangs that stop clicks and keystrokes from working
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-rasterization');
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');

// Process guards to prevent silent crashes or freezes
process.on('uncaughtException', (err) => {
  console.error('[Main Process] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main Process] Unhandled Rejection at:', promise, 'reason:', reason);
});

const isDev = !app.isPackaged;
const localServer = require('./localServer.cjs');

// IPC Handlers for Local Restaurant Server (WiFi Tablets)
ipcMain.handle('get-server-info', async () => {
  if (typeof localServer.getServerInfoAsync === 'function') {
    return await localServer.getServerInfoAsync();
  }
  return localServer.getServerInfo();
});

ipcMain.handle('refresh-server-ip', async (event, manualIp) => {
  if (typeof localServer.refreshServerIp === 'function') {
    await localServer.refreshServerIp(manualIp);
    return typeof localServer.getServerInfoAsync === 'function'
      ? await localServer.getServerInfoAsync()
      : localServer.getServerInfo();
  }
  return localServer.getServerInfo();
});

ipcMain.handle('restart-server', async () => {
  localServer.stopServer();
  try {
    const serverPath = require.resolve('./localServer.cjs');
    delete require.cache[serverPath];
  } catch (e) {}
  const freshServer = require('./localServer.cjs');
  return await freshServer.startServer(3001, app.getPath('userData'));
});

// IPC Handler for reliable printer discovery and native thermal printing
ipcMain.handle('get-printers', async () => {
  if (!mainWindowRef || !mainWindowRef.webContents) return [];
  try {
    return await mainWindowRef.webContents.getPrintersAsync();
  } catch (e) {
    console.error('Error fetching printers:', e);
    return [];
  }
});

ipcMain.handle('print-window', async (event, options = {}) => {
  // Option A: Isolated Ticket Printing (Prevents 1400px desktop layout from shrinking 58mm roll)
  if (options && options.html) {
    return new Promise(async (resolve) => {
      let printWin = null;
      try {
        const is58 = options.paperSize === '58mm' || !options.paperSize || options.paperSize === '48mm';
        const widthMm = is58 ? 58 : 80;
        const printableWidth = is58 ? '48mm' : '72mm';

        printWin = new BrowserWindow({
          show: false,
          parent: mainWindowRef || undefined,
          modal: false,
          width: is58 ? 240 : 360,
          height: 800,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        });

        // Validate printer device if specified
        let targetDevice = options.deviceName || '';
        try {
          const systemPrinters = await printWin.webContents.getPrintersAsync();
          if (targetDevice && !systemPrinters.some(p => p.name.toLowerCase() === targetDevice.toLowerCase())) {
            console.warn(`[Printer] Dispositivo '${targetDevice}' no coincide con lista de Windows. Usando default.`);
            targetDevice = '';
          }
        } catch (pe) {
          console.warn('[Printer] No se pudo obtener lista de impresoras:', pe);
        }

        const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Ticket</title>
<style>
  @page {
    size: ${widthMm}mm auto;
    margin: 0mm !important;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    width: ${printableWidth} !important;
    max-width: ${printableWidth} !important;
    margin: 0 auto !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #000000 !important;
    font-family: Arial, Helvetica, sans-serif !important;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  .ticket-paper {
    width: 100% !important;
    max-width: ${printableWidth} !important;
    margin: 0 auto !important;
    padding: 0 1mm !important;
    box-sizing: border-box !important;
    font-size: ${is58 ? '9.5px' : '10.5px'} !important;
    line-height: 1.25 !important;
    font-weight: 400 !important;
    color: #000000 !important;
    background: #ffffff !important;
    font-family: Arial, Helvetica, sans-serif !important;
  }
  .ticket-center { text-align: center !important; }
  .ticket-right { text-align: right !important; }
  .ticket-bold { font-weight: 600 !important; }
  .ticket-divider { border-top: 1px dashed #000000 !important; margin: 3px 0 !important; }
  .ticket-double-divider { border-top: 1px dashed #000000 !important; margin: 4px 0 !important; }
  .k-center { text-align: center !important; }
  .k-bold { font-weight: 700 !important; }
  .k-divider { border-top: 1px dashed #000000 !important; margin: 3px 0 !important; }
  .k-double-divider { border-top: 1px dashed #000000 !important; margin: 4px 0 !important; }
  .kitchen-paper {
    width: 100% !important;
    max-width: ${printableWidth} !important;
    box-sizing: border-box !important;
    font-family: Arial, Helvetica, sans-serif !important;
    font-size: ${is58 ? '10px' : '11.5px'} !important;
    line-height: 1.15 !important;
    color: #000000 !important;
    background: #ffffff !important;
    padding: 0 1mm !important;
  }
</style>
</head>
<body>
${options.html}
</body>
</html>`;

        printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);

        printWin.webContents.on('did-finish-load', () => {
          setTimeout(() => {
            if (!printWin || printWin.isDestroyed()) {
              return resolve({ success: false, failureReason: 'Ventana de impresión cerrada' });
            }
            printWin.webContents.print({
              silent: options.silent || false,
              deviceName: targetDevice,
              printBackground: true,
              margins: { marginType: 'none' }
            }, (success, failureReason) => {
              try {
                if (printWin && !printWin.isDestroyed()) printWin.close();
              } catch (e) {}
              resolve({ success, failureReason });
            });
          }, 200);
        });

        printWin.webContents.on('did-fail-load', (e, code, desc) => {
          try {
            if (printWin && !printWin.isDestroyed()) printWin.close();
          } catch (err) {}
          resolve({ success: false, failureReason: desc });
        });
      } catch (err) {
        try {
          if (printWin && !printWin.isDestroyed()) printWin.close();
        } catch (e) {}
        resolve({ success: false, failureReason: err.message });
      }
    });
  }

  // Option B: Legacy Window Print Fallback
  if (!mainWindowRef || !mainWindowRef.webContents) {
    return { success: false, error: 'Ventana no disponible' };
  }
  return new Promise((resolve) => {
    try {
      mainWindowRef.webContents.print({
        silent: options.silent || false,
        printBackground: true,
        deviceName: options.deviceName || '',
        margins: options.margins || { marginType: 'none' }
      }, (success, failureReason) => {
        resolve({ success, failureReason });
      });
    } catch (err) {
      resolve({ success: false, failureReason: err.message });
    }
  });
});

// Helper paths for file-based database
const getDbPath = () => path.join(app.getPath('userData'), 'facturapos_db.json');
const getDbBackupPath = () => path.join(app.getPath('userData'), 'facturapos_db.json.bak');
const getDbTempPath = () => path.join(app.getPath('userData'), 'facturapos_db.json.tmp');

// Initialize IPC Handlers for Local File Storage (Protected against power cuts)
ipcMain.handle('load-db', async () => {
  const dbPath = getDbPath();
  const backupPath = getDbBackupPath();

  // 1. Try reading the primary database file
  if (fs.existsSync(dbPath)) {
    try {
      const rawData = fs.readFileSync(dbPath, 'utf-8');
      if (rawData && rawData.trim().length > 0) {
        return JSON.parse(rawData);
      }
    } catch (error) {
      console.error('Primary DB file corrupted or incomplete, attempting backup recovery:', error);
    }
  }

  // 2. If primary is corrupted or missing, auto-recover from .bak
  if (fs.existsSync(backupPath)) {
    try {
      console.warn('Recovering database from facturapos_db.json.bak...');
      const rawBackup = fs.readFileSync(backupPath, 'utf-8');
      if (rawBackup && rawBackup.trim().length > 0) {
        const parsed = JSON.parse(rawBackup);
        // Restore backup as primary
        fs.copyFileSync(backupPath, dbPath);
        return parsed;
      }
    } catch (backupError) {
      console.error('Backup DB recovery failed:', backupError);
    }
  }

  return {};
});

ipcMain.handle('save-db', async (event, data) => {
  try {
    const dbPath = getDbPath();
    const backupPath = getDbBackupPath();
    const tempPath = getDbTempPath();

    const jsonString = JSON.stringify(data, null, 2);

    // Step A: Write to temporary file asynchronously (non-blocking)
    await fs.promises.writeFile(tempPath, jsonString, 'utf-8');

    // Step B: Back up existing DB before replacing
    if (fs.existsSync(dbPath)) {
      try {
        await fs.promises.copyFile(dbPath, backupPath);
      } catch (bkpErr) {
        console.warn('Could not update .bak file:', bkpErr);
      }
    }

    // Step C: Safely replace main DB with temp file (Windows immune to lock issues)
    try {
      await fs.promises.copyFile(tempPath, dbPath);
      await fs.promises.unlink(tempPath).catch(() => {});
    } catch (renameErr) {
      console.warn('Fallback copy error on Windows:', renameErr);
    }

    return { success: true };
  } catch (error) {
    console.error('Error writing DB atomically:', error);
    return { success: false, error: error.message };
  }
});

let mainWindowRef = null;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'FacturaPOS',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // Never pause timers or inputs when unfocused or occluded on Windows
    },
    autoHideMenuBar: true,
    backgroundColor: '#0a0e1a',
  });

  mainWindowRef = mainWindow;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindowRef = null;
  });
}

// Focus existing window if a second instance is started
app.on('second-instance', () => {
  if (mainWindowRef) {
    if (mainWindowRef.isMinimized()) mainWindowRef.restore();
    mainWindowRef.focus();
  }
});

app.whenReady().then(async () => {
  try {
    await localServer.startServer(3001, app.getPath('userData'));
  } catch (err) {
    console.error('Error starting local restaurant server on port 3001:', err);
  }
  createWindow();
});

app.on('window-all-closed', () => {
  localServer.stopServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  localServer.stopServer();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
