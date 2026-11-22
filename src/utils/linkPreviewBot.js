export const SOCIAL_BOT_UA =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Slackbot|Discordbot|Pinterest|Googlebot|Embedly|ia_archiver/i;

export const LINK_PREVIEW_PATH =
  /^\/$|^\/profile\/[^/]+\/?$|^\/post\/[^/]+\/?$|^\/posts\/[^/]+\/?$/i;

export function isSocialPreviewPath(pathname) {
  return LINK_PREVIEW_PATH.test(String(pathname || '/').split('?')[0]);
}

export function isSocialCrawlerUserAgent(userAgent) {
  return SOCIAL_BOT_UA.test(userAgent || '');
}