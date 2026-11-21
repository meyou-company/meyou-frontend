const MFA_CHALLENGE_KEY = 'lunmeyo_mfa_challenge';

export function saveMfaChallenge({ challengeToken, expiresInSec }) {
  if (typeof sessionStorage === 'undefined') return;
  const expiresAt = Date.now() + (expiresInSec ?? 600) * 1000;
  sessionStorage.setItem(
    MFA_CHALLENGE_KEY,
    JSON.stringify({ challengeToken, expiresAt }),
  );
}

export function readMfaChallenge() {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(MFA_CHALLENGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.challengeToken || parsed.expiresAt < Date.now()) {
      clearMfaChallenge();
      return null;
    }
    return parsed;
  } catch {
    clearMfaChallenge();
    return null;
  }
}

export function clearMfaChallenge() {
  try {
    sessionStorage.removeItem(MFA_CHALLENGE_KEY);
  } catch {
    /* ignore */
  }
}