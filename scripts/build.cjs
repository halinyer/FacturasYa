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

// Escribir metadatos exactos de compilación (SHA y timestamp UTC) dentro de dist/build-info.json
// para que el auto-actualizador de Electron no dependa de fs.statSync dentro de app.asar
let commitSha = process.env.GITHUB_SHA || 'local';
if (commitSha === 'local') {
  try {
    commitSha = execSync('git rev-parse HEAD', { cwd: rootDir }).toString().trim();
  } catch (e) {}
}
const buildInfo = {
  commitSha,
  buildTimestamp: Date.now(),
  builtAt: new Date().toISOString()
};
fs.writeFileSync(path.join(distDir, 'build-info.json'), JSON.stringify(buildInfo, null, 2), 'utf8');
console.log(`🔖 Metadatos de build generados: SHA=${commitSha.slice(0, 7)} (${buildInfo.builtAt})`);

console.log('📦 [3/3] Empaquetando ejecutables Desktop con Electron Builder...');
execSync('npx electron-builder --win --publish never', { stdio: 'inherit', cwd: rootDir });

const debugYml = path.join(distElectronDir, 'builder-debug.yml');
if (fs.existsSync(debugYml)) {
  try { fs.rmSync(debugYml, { force: true }); } catch (e) {}
}

console.log('\n✅ ¡Listo! Compilación Desktop completada con éxito.');
console.log('  ➜ 1. Ejecutable directo (Apertura inmediata): dist-electron/win-unpacked/FacturaPOS.exe');
console.log('  ➜ 2. Ejecutable Portable (Sin instalación, no sobreescribe nada): dist-electron/FacturasYa-Cloud-POS-1.0.0.exe');
console.log('  ➜ 3. Instalador Guiado NSIS: dist-electron/FacturasYa-Cloud-POS-Setup-1.0.0.exe\n');
