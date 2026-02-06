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
      '/api': 'http://localhost:8787',
      '/mcp': 'http://localhost:8787',
      '/health': 'http://localhost:8787',
    },
  },
  build: {
    outDir: '../public',
    emptyOutDir: false, // Preserve other files (usage.html, data/)
  },
});
