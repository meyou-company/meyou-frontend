import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const DEFAULT_DEV_API_PROXY_TARGET = 'https://api.lunmeyo.com';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget =
    env.VITE_DEV_API_PROXY_TARGET?.trim() ||
    process.env.VITE_DEV_API_PROXY_TARGET?.trim() ||
    DEFAULT_DEV_API_PROXY_TARGET;

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
          cookieDomainRewrite: 'localhost',
        },
        '/socket.io': {
          target: proxyTarget,
          ws: true,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});