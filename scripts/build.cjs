const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const distElectronDir = path.join(rootDir, 'dist-electron');

function safeRemove(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  try {
    fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
  } catch (e) {
    console.warn(`[Aviso] No se pudo limpiar completamente ${dirPath}: ${e.message}`);
  }
}

console.log('\n🧹 [1/3] Purgando compilaciones y ejecutables viejos...');
safeRemove(distDir);
safeRemove(distElectronDir);

console.log('⚡ [2/3] Compilando frontend web (Vite)...');
execSync('npx vite build', { stdio: 'inherit', cwd: rootDir });

console.log('📦 [3/3] Empaquetando ejecutables con Electron Builder...');
execSync('npx electron-builder --win', { stdio: 'inherit', cwd: rootDir });

const debugYml = path.join(distElectronDir, 'builder-debug.yml');
if (fs.existsSync(debugYml)) {
  try { fs.rmSync(debugYml, { force: true }); } catch (e) {}
}

console.log('\n✅ ¡Listo! Compilación completada con éxito.');
console.log('  ➜ 1. Ejecutable directo (Apertura inmediata): dist-electron/win-unpacked/FacturaPOS.exe');
console.log('  ➜ 2. Ejecutable portable (Para llevar en Pendrive): dist-electron/FacturaPOS-1.0.0.exe\n');
