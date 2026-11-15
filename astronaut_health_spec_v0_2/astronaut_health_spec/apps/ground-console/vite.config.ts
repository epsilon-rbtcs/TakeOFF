import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Ground API listens on 127.0.0.1:8000. The dev server proxies /api so the
// console can use a same-origin base (`/api/v1`) without changing the backend
// CORS allow-list. Deployments set VITE_API_URL instead.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 1421,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
