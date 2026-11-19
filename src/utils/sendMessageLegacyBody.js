/** Drop fields a forbidNonWhitelisted API does not know yet. Keep sticker tokens in `text`. */
export function sendMessageBodyForLegacyApi(body) {
  if (!body || typeof body !== 'object') return null;
  const next = { ...body };
  let changed = false;
  if ('clientId' in next) {
    delete next.clientId;
    changed = true;
  }
  if ('metadata' in next) {
    delete next.metadata;
    changed = true;
  }
  return changed ? next : null;
}
