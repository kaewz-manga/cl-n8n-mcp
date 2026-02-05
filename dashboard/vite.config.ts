import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3011',
      '/mcp': 'http://localhost:3011',
      '/health': 'http://localhost:3011',
      '/stats': 'http://localhost:3011',
    },
  },
  build: {
    outDir: '../public/dashboard',
    emptyOutDir: true,
  },
});
