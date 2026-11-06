import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// Web pública (Vercel/Cloudflare Pages): base absoluta, Tailwind CSS v4 + React
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@pos': path.resolve(__dirname, './src/pos-core')
    }
  },
  server: {
    fs: {
      allow: ['..']
    }
  },
  base: '/',
  build: { outDir: 'dist' },
  // Permite que Vite lea tanto las variables con VITE_ como las que inyecta automáticamente la integración de Supabase en Vercel
  envPrefix: ['VITE_', 'SUPABASE_']
});
