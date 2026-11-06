const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src');
const destDir = path.resolve(__dirname, '../web/src/pos-core');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip main.jsx or App.jsx if not needed, but copying all is fine
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log(`Syncing from ${srcDir} to ${destDir}...`);
copyDirRecursive(srcDir, destDir);
console.log('Sync complete!');
