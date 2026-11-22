import {
  isSocialCrawlerUserAgent,
  isSocialPreviewPath,
} from './src/utils/linkPreviewBot.js';
import { buildSafeDefaultOgHtml } from './src/utils/linkPreviewFallbackHtml.js';
import { cacheControlForPreviewPath } from './src/utils/linkPreviewCache.js';

export const config = {
  matcher: ['/', '/profile/:path*', '/post/:path*', '/posts/:path*'],
};

export default async function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!isSocialCrawlerUserAgent(ua)) {
    return;
  }

  const url = new URL(request.url);
  if (!isSocialPreviewPath(url.pathname)) {
    return;
  }

  const apiOrigin =
    process.env.LINK_PREVIEW_API_ORIGIN?.replace(/\/$/, '') ||
    'https://api.lunmeyo.com';

  const renderUrl = new URL(`${apiOrigin}/api/public/link-preview/render`);
  renderUrl.searchParams.set('path', url.pathname);
  const lang = url.searchParams.get('lang');
  if (lang) renderUrl.searchParams.set('lang', lang);

  const upstreamTimeoutMs = 12_000;

  const fallbackResponse = () =>
    new Response(buildSafeDefaultOgHtml(), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': cacheControlForPreviewPath(url.pathname, {
          fallback: true,
        }),
      },
    });

  try {
    const upstream = await fetch(renderUrl.toString(), {
      headers: { Accept: 'text/html' },
      signal: AbortSignal.timeout(upstreamTimeoutMs),
    });
    if (!upstream.ok) {
      return fallbackResponse();
    }
    const html = await upstream.text();
    if (!html.includes('og:image')) {
      return fallbackResponse();
    }
    const cacheFromApi = upstream.headers.get('cache-control');
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control':
          cacheFromApi ??
          cacheControlForPreviewPath(url.pathname, { fallback: false }),
      },
    });
  } catch {
    return fallbackResponse();
  }
}