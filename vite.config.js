import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        // Local Nest (PORT=3001). Override for remote API: VITE_DEV_API_PROXY_TARGET=https://meyou-api.onrender.com
        target: process.env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:3001',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
      },
    },
  },
});