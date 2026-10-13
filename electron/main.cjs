const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
const localServer = require('./localServer.cjs');

// IPC Handlers for Local Restaurant Server (WiFi Tablets)
ipcMain.handle('get-server-info', async () => {
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

    // Step A: Write to temporary file first
    fs.writeFileSync(tempPath, jsonString, 'utf-8');

    // Step B: Back up existing DB before replacing
    if (fs.existsSync(dbPath)) {
      try {
        fs.copyFileSync(dbPath, backupPath);
      } catch (bkpErr) {
        console.warn('Could not update .bak file:', bkpErr);
      }
    }

    // Step C: Atomically replace main DB with temp file
    try {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      fs.renameSync(tempPath, dbPath);
    } catch (renameErr) {
      // Fallback for Windows lock edge cases
      fs.copyFileSync(tempPath, dbPath);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }

    return { success: true };
  } catch (error) {
    console.error('Error writing DB atomically:', error);
    return { success: false, error: error.message };
  }
});

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
    },
    autoHideMenuBar: true,
    backgroundColor: '#0a0e1a',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

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
