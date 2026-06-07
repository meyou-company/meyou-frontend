import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        // Nest default PORT=3000 (.env may override). Override: VITE_DEV_API_PROXY_TARGET
        target: process.env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
      },
      '/socket.io': {
        target: process.env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});