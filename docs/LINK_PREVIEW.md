# Social link preview (Open Graph)

## Architecture

| Layer | Role |
|-------|------|
| `index.html` | Default `og:*` / `twitter:*` for home (no JS) |
| `public/og/lunmeyo-og.png` | 1200×630 default card (`npm run og:generate`; composites `public/Logo/lunmeyo.jpg`, same brand as `favicon.png`) |
| `middleware.js` (Vercel Edge) | Social crawlers → `GET {API}/api/public/link-preview/render?path=…&lang=` |
| Nest `LinkPreviewModule` | Safe metadata from DB; private content → restricted card |

## Languages

Supported `?lang=` codes: `uk`, `en`, `ru`, `cs`, `fr`, `es`, `tr` (aligned with API `link-preview.locales.ts` and `linkPreview` i18n keys).

Separate localized URLs are not used; crawlers usually cache one preview per URL.

## Vercel

- Optional env: `LINK_PREVIEW_API_ORIGIN` (default `https://api.lunmeyo.com`).
- Deploy **API first**, then frontend with middleware.

## Manual checks after deploy

- View source / curl with `User-Agent: facebookexternalhit/1.1` on `/`, `/profile/{public}`, `/post/{public}`, private cases.
- Facebook Sharing Debugger, Telegram, WhatsApp (each caches independently).