/** Extract base32 secret from otpauth URI — client-only helper for manual entry UI. */
export function parseOtpauthSecret(otpauthUri) {
  if (!otpauthUri || typeof otpauthUri !== 'string') {
    return null;
  }
  try {
    const url = new URL(otpauthUri);
    const secret = url.searchParams.get('secret')?.trim();
    return secret || null;
  } catch {
    const match = otpauthUri.match(/[?&]secret=([A-Za-z2-7]+)/i);
    return match?.[1]?.toUpperCase() ?? null;
  }
}