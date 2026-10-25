const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const distElectronDir = path.join(rootDir, 'dist-electron');

console.log('\n🧹 [1/4] Purgando compilaciones y ejecutables viejos...');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
if (fs.existsSync(distElectronDir)) {
  fs.rmSync(distElectronDir, { recursive: true, force: true });
}

console.log('⚡ [2/4] Compilando frontend web (Vite)...');
execSync('npx vite build', { stdio: 'inherit', cwd: rootDir });

console.log('📦 [3/3] Empaquetando ejecutables con Electron Builder...');
execSync('npx electron-builder --win', { stdio: 'inherit', cwd: rootDir });

const debugYml = path.join(distElectronDir, 'builder-debug.yml');
if (fs.existsSync(debugYml)) {
  fs.rmSync(debugYml, { force: true });
}

console.log('\n✅ ¡Listo! Compilación completada con éxito.');
console.log('  ➜ 1. Ejecutable directo (Apertura inmediata): dist-electron/win-unpacked/HeladosCali-POS.exe');
console.log('  ➜ 2. Ejecutable portable (Para llevar en Pendrive): dist-electron/HeladosCali-POS-1.0.0.exe\n');
