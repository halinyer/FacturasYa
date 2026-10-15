const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  loadDb: () => ipcRenderer.invoke('load-db'),
  saveDb: (data) => ipcRenderer.invoke('save-db', data),
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  refreshServerIp: (manualIp) => ipcRenderer.invoke('refresh-server-ip', manualIp),
  restartServer: () => ipcRenderer.invoke('restart-server'),
});
