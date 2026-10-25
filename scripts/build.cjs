const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const distElectronDir = path.join(rootDir, 'dist-electron');

console.log('\n🧹 [1/4] Purgando compilaciones y ejecutables viejos...');
function safeRemove(dir) {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
    } catch (e) {
      console.warn(`[Aviso] No se pudo purgar completamente ${dir}: ${e.message}`);
    }
  }
}

safeRemove(distDir);
safeRemove(distElectronDir);

console.log('⚡ [2/4] Compilando frontend web (Vite)...');
execSync('npx vite build', { stdio: 'inherit', cwd: rootDir });

console.log('📦 [3/3] Empaquetando ejecutables con Electron Builder...');
execSync('npx electron-builder --win', { stdio: 'inherit', cwd: rootDir });

const debugYml = path.join(distElectronDir, 'builder-debug.yml');
if (fs.existsSync(debugYml)) {
  try {
    fs.rmSync(debugYml, { force: true });
  } catch (e) {}
}

console.log('\n✅ ¡Listo! Compilación completada con éxito.');
console.log('  ➜ 1. Ejecutable directo (Apertura inmediata): dist-electron/win-unpacked/HeladosLaCascada-POS.exe');
console.log('  ➜ 2. Ejecutable portable (Para llevar en Pendrive): dist-electron/HeladosLaCascada-POS-1.0.0.exe\n');
