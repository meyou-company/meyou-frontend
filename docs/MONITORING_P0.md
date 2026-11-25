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