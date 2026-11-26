# Production monitoring P0 (meyou-frontend)

## Features

- Sentry (opt-in via `VITE_SENTRY_*`)
- Root error boundary (i18n: uk, en, ru, cs, fr, es, tr, ar)
- Global unhandled errors / rejections
- API 5xx reporting (status, code, method, path without query — no bodies)

## ENV

| Variable | Default |
|----------|---------|
| `VITE_SENTRY_ENABLED` | off |
| `VITE_SENTRY_DSN` | empty |
| `VITE_SENTRY_ENVIRONMENT` | `import.meta.env.MODE` |
| `VITE_SENTRY_SAMPLE_RATE` | `1` |
| `VITE_APP_RELEASE` | `dev` |

Set `VITE_APP_RELEASE` in Vercel build env to git SHA.

## Activation

1. Sentry project for browser (separate from API).
2. Vercel env: `VITE_SENTRY_ENABLED=true`, `VITE_SENTRY_DSN=...`
3. Redeploy frontend.

## Rollback

`VITE_SENTRY_ENABLED=false` + redeploy.

## UptimeRobot

Monitor `https://lunmeyo.com` (or production SPA URL) HTTP 200.

## Sentry troubleshooting (frontend)

**Vercel (build-time, not runtime):**

- Names must be `VITE_SENTRY_ENABLED` and `VITE_SENTRY_DSN` (not `SENTRY_DSN`).
- `VITE_SENTRY_ENABLED` must be the string `true` (lowercase).
- Apply to **Production**, then **Redeploy**.

**Verify DSN is baked in:** production `assets/index-*.js` should contain your EU ingest host (e.g. `ingest.de.sentry.io`). If absent, SDK never initializes.

**Manual smoke (one shot, after DSN in bundle):** DevTools Console on `https://lunmeyo.com`:

```javascript
window.dispatchEvent(
  new ErrorEvent('error', { error: new Error('LUNMEYO_SENTRY_SMOKE') }),
);
```

Check Network for POST to `ingest…sentry.io`. Plain `throw new Error(...)` in the Console often does not reach page handlers.

**Local pipeline check:** `npm run test:sentry-smoke` (dry). Live: `SENTRY_SMOKE_DSN=<EU DSN> npm run test:sentry-smoke`.