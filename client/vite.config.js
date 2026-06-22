import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The CRM SPA is served under /app in production (Express serves client/dist at /app).
export default defineConfig({
  plugins: [react()],
  base: '/app/',
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
