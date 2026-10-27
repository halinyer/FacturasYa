const path = require('path');
const fs = require('fs');
const localServer = require('../electron/localServer.cjs');

const rootDir = path.resolve(__dirname, '..');
const appDataDir = process.env.APPDATA ? path.join(process.env.APPDATA, 'facturacion-pos') : '';
const targetDataDir = (appDataDir && fs.existsSync(appDataDir)) ? appDataDir : rootDir;

async function main() {
  console.log('[Monitor Service] Arrancando servidor local y túnel Cloudflare con datos en:', targetDataDir);
  const info = await localServer.startServer(3001, targetDataDir);
  console.log('[Monitor Service] Servidor HTTP local escuchando en el puerto 3001');

  process.on('SIGINT', () => {
    console.log('[Monitor Service] Deteniendo servidor...');
    localServer.stopServer();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('[Monitor Service Error]:', err);
  process.exit(1);
});
