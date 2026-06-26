import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base path: '/app/' for single-origin (Express serves at /app); set VITE_BASE_PATH=/
// when deploying the SPA standalone on Vercel (served at the domain root).
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/app/',
  server: {
    port: 5173,
    proxy: {
      // In dev, proxy API + docs to the Express server on :3000.
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
});
