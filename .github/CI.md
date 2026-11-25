# meyou-frontend CI

## GitHub Actions

Workflow [`.github/workflows/ci.yml`](workflows/ci.yml) runs on **pull requests to `main`** and pushes to `main`:

1. `npm ci`
2. `npm run lint` (ESLint flat config)
3. `npm run build` (Vite production build)
4. `npm run test:ci` — all Vitest files (`vitest.config.js`, `jsdom`)

CI sets dummy `VITE_*` URLs (`127.0.0.1`) for the build step. Tests use mocks (`vi.mock`, `vi.stubEnv`); no live API, Cloudinary, or auth secrets.

## Local (same as CI)

```bash
npm ci
export VITE_API_URL=http://127.0.0.1:3001/api
export VITE_SOCKET_URL=http://127.0.0.1:3001
export VITE_PUBLIC_APP_URL=http://127.0.0.1:5173
npm run lint
npm run build
npm run test:ci
```