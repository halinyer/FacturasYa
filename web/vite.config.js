import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Web pública (Vercel/Cloudflare Pages): base absoluta, a diferencia del POS Electron (base './')
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: { outDir: 'dist' }
});
