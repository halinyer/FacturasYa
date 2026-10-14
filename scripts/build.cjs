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

console.log('📦 [3/4] Empaquetando ejecutable único con Electron Builder...');
execSync('npx electron-builder --win portable', { stdio: 'inherit', cwd: rootDir });

console.log('🗑️ [4/4] Limpiando ejecutables intermedios duplicados (win-unpacked)...');
const winUnpackedDir = path.join(distElectronDir, 'win-unpacked');
if (fs.existsSync(winUnpackedDir)) {
  fs.rmSync(winUnpackedDir, { recursive: true, force: true });
}

const debugYml = path.join(distElectronDir, 'builder-debug.yml');
if (fs.existsSync(debugYml)) {
  fs.rmSync(debugYml, { force: true });
}

console.log('\n✅ ¡Listo! Único ejecutable generado limpiamente en dist-electron/FacturaPOS-1.0.0.exe\n');
