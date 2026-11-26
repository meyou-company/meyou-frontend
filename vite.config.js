import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { Agent } from 'node:https';
import * as tls from 'node:tls';
import { snapshotSentryBuildEnv } from './scripts/sentry-env-snapshot.mjs';

const DEFAULT_DEV_API_PROXY_TARGET = 'https://api.lunmeyo.com';

function sentryBuildDiagnosticPlugin() {
  return {
    name: 'lunmeyo-sentry-build-diagnostic',
    config(_config, { command, mode }) {
      if (command !== 'build' || mode !== 'production') return;
      const snapshot = snapshotSentryBuildEnv();
      // eslint-disable-next-line no-console -- intentional CI/Vercel build log
      console.log(
        `[sentry-build-diag] ${JSON.stringify({
          phase: 'vite_config',
          snapshot,
        })}`,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxyTarget =
    env.VITE_DEV_API_PROXY_TARGET?.trim() ||
    process.env.VITE_DEV_API_PROXY_TARGET?.trim() ||
    DEFAULT_DEV_API_PROXY_TARGET;
  // Include OS-trusted certificates for local HTTPS proxies without disabling TLS verification.
  const proxyAgent = proxyTarget.startsWith('https:') && typeof tls.getCACertificates === 'function'
    ? new Agent({ ca: [...new Set([
        ...tls.getCACertificates('default'),
        ...tls.getCACertificates('system'),
      ])] })
    : undefined;

  return {
    envPrefix: 'VITE_',
    plugins: [react(), sentryBuildDiagnosticPlugin()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
          agent: proxyAgent,
          cookieDomainRewrite: 'localhost',
        },
        '/socket.io': {
          target: proxyTarget,
          ws: true,
          changeOrigin: true,
          secure: true,
          agent: proxyAgent,
        },
      },
    },
  };
});
