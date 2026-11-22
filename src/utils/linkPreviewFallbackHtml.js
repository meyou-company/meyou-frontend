/** Safe default Open Graph HTML when the API is unavailable (bots only). No private fields. */

const DEFAULT_ORIGIN = 'https://lunmeyo.com';
const DEFAULT_IMAGE = `${DEFAULT_ORIGIN}/og/lunmeyo-og.png`;

const TITLE = 'LUNMEYO — More Than a Social Network';
const DESCRIPTION =
  'Connect, create, share and discover new possibilities. Meet people, express yourself and explore opportunities to earn on LUNMEYO.';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function resolveLinkPreviewPublicOrigin() {
  const fromEnv =
    process.env.VITE_PUBLIC_APP_URL?.trim() ||
    process.env.LINK_PREVIEW_PUBLIC_ORIGIN?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return DEFAULT_ORIGIN;
}

/**
 * Standard LUNMEYO card — same for every path when upstream fails (no profile/post leakage).
 */
export function buildSafeDefaultOgHtml() {
  const origin = resolveLinkPreviewPublicOrigin();
  const url = `${origin}/`;
  const image = origin === DEFAULT_ORIGIN ? DEFAULT_IMAGE : `${origin}/og/lunmeyo-og.png`;
  const title = escapeHtml(TITLE);
  const description = escapeHtml(DESCRIPTION);
  const safeUrl = escapeHtml(url);
  const safeImage = escapeHtml(image);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${safeUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="LUNMEYO" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${safeImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${safeImage}" />
    <meta http-equiv="refresh" content="0;url=${safeUrl}" />
  </head>
  <body>
    <p><a href="${safeUrl}">${title}</a></p>
  </body>
</html>`;
}