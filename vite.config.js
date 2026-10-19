import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    watch: {
      ignored: ['**/dist-electron/**', '**/dist/**', '**/*.tmp']
    }
  },
  build: {
    outDir: 'dist'
  }
});
