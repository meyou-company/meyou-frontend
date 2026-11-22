import {
  isSocialCrawlerUserAgent,
  isSocialPreviewPath,
} from './src/utils/linkPreviewBot.js';

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

  try {
    const upstream = await fetch(renderUrl.toString(), {
      headers: { Accept: 'text/html' },
    });
    const html = await upstream.text();
    return new Response(html, {
      status: upstream.ok ? 200 : 502,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch {
    return new Response('<!doctype html><title>LUNMEYO</title>', {
      status: 502,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}