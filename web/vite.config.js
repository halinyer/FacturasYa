import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Web pública (Vercel/Cloudflare Pages): base absoluta, Tailwind CSS v4 + React
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  base: '/',
  build: { outDir: 'dist' }
});
