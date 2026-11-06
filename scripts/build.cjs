const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const distElectronDir = path.join(rootDir, 'dist-electron');
const webDir = path.join(rootDir, 'web');
const webDistDir = path.join(webDir, 'dist');

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
safeRemove(webDistDir);

console.log('⚡ [2/3] Compilando frontend moderno Notion SaaS (FacturasYa Web)...');
execSync('npm run build', { stdio: 'inherit', cwd: webDir });

if (!fs.existsSync(webDistDir)) {
  throw new Error('Error: web/dist no fue generado tras la compilación.');
}

console.log('📋 Sincronizando bundle web hacia dist/ para Electron...');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
fs.cpSync(webDistDir, distDir, { recursive: true });

console.log('📦 [3/3] Empaquetando ejecutables Desktop con Electron Builder...');
execSync('npx electron-builder --win', { stdio: 'inherit', cwd: rootDir });

const debugYml = path.join(distElectronDir, 'builder-debug.yml');
if (fs.existsSync(debugYml)) {
  try { fs.rmSync(debugYml, { force: true }); } catch (e) {}
}

console.log('\n✅ ¡Listo! Compilación Desktop completada con éxito.');
console.log('  ➜ 1. Ejecutable directo (Apertura inmediata): dist-electron/win-unpacked/FacturaPOS.exe');
console.log('  ➜ 2. Ejecutable portable (Para llevar en Pendrive): dist-electron/FacturaPOS-1.0.0.exe\n');
