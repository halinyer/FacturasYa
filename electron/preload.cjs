const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  loadDb: () => ipcRenderer.invoke('load-db'),
  saveDb: (data) => ipcRenderer.invoke('save-db', data),
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  refreshServerIp: (manualIp) => ipcRenderer.invoke('refresh-server-ip', manualIp),
  restartServer: () => ipcRenderer.invoke('restart-server'),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printWindow: (options) => ipcRenderer.invoke('print-window', options),
  fiscal: {
    getPorts: () => ipcRenderer.invoke('fiscal:get-ports'),
    autoDetectPort: (preferredPort) => ipcRenderer.invoke('fiscal:auto-detect-port', preferredPort),
    testConnection: (port) => ipcRenderer.invoke('fiscal:test-connection', port),
    getS1Status: (port) => ipcRenderer.invoke('fiscal:get-s1-status', port),
    getAuditStatus: (port) => ipcRenderer.invoke('fiscal:get-audit-status', port),
    printReportX: (port) => ipcRenderer.invoke('fiscal:report-x', port),
    printReportZ: (port) => ipcRenderer.invoke('fiscal:report-z', port),
    printInvoice: (port, invoiceData) => ipcRenderer.invoke('fiscal:print-invoice', port, invoiceData),
    cancelInvoice: (port) => ipcRenderer.invoke('fiscal:cancel-invoice', port),
    getFiscalMemory: (port, options) => ipcRenderer.invoke('fiscal:get-fiscal-memory', port, options),
    printFiscalMemory: (port, options) => ipcRenderer.invoke('fiscal:print-fiscal-memory', port, options),
    launchEmulator: () => ipcRenderer.invoke('fiscal:launch-emulator'),
    getFiscalLog: () => ipcRenderer.invoke('fiscal:get-log'),
    openLogFile: () => ipcRenderer.invoke('fiscal:open-log-file')
  }
});
