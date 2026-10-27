const path = require('path');
const fs = require('fs');
const localServer = require('../electron/localServer.cjs');

const rootDir = path.resolve(__dirname, '..');

async function main() {
  console.log('[Monitor Service] Arrancando servidor local y túnel Cloudflare...');
  const info = await localServer.startServer(3001, rootDir);
  console.log('[Monitor Service] Servidor HTTP local escuchando en el puerto 3001');

  // Mantener el proceso vivo indefinidamente
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
