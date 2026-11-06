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
  build: { outDir: 'dist' },
  // Permite que Vite lea tanto las variables con VITE_ como las que inyecta automáticamente la integración de Supabase en Vercel
  envPrefix: ['VITE_', 'SUPABASE_']
});
