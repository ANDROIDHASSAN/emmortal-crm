import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Single-folder app. The React CRM is served at /app (base '/app/'), so it
// coexists with the Express storefront at '/'. Build output goes to dist/app
// so on Vercel the files live at the URL path /app/* (matching the base).
export default defineConfig({
  plugins: [react()],
  base: '/app/',
  server: {
    port: 5173,
    proxy: {
      // In local dev, proxy API calls to the Express server (npm run dev:api).
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist/app',
    emptyOutDir: true,
  },
});
