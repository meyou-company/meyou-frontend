import { i18n } from '../i18n';

const TECHNICAL_MESSAGE_PATTERNS = [
  /^Request failed with status code \d+/i,
  /^Network Error$/i,
  /^AxiosError\b/i,
  /^ValidationError\b/i,
  /^HttpException\b/i,
  /^\d{3}\s+(Bad Request|Unauthorized|Forbidden|Not Found|Conflict|Unprocessable Entity|Internal Server Error)/i,
  /^timeout of \d+ms exceeded/i,
  /^(ECONNABORTED|ERR_NETWORK|ETIMEDOUT)$/i,
];

/** Map legacy / generic server messages to stable API error codes. */
const MESSAGE_CODE_HINTS = [
  { pattern: /email.*(already|exists|існує|занят|exist)/i, code: 'EMAIL_ALREADY_EXISTS' },
  {
    pattern: /(invalid|неверн|невірн|wrong).*(email|password|пароль|e-mail)/i,
    code: 'INVALID_CREDENTIALS',
  },
  { pattern: /username.*(taken|занят|зайнят)/i, code: 'USERNAME_TAKEN' },
  { pattern: /(никнейм|нікнейм|nickname).*(занят|зайнят|taken)/i, code: 'USERNAME_TAKEN' },
  { pattern: /(verify|підтверд|confirm).*(email|пошт)/i, code: 'EMAIL_NOT_VERIFIED' },
  { pattern: /(blocked|заблокован|suspended)/i, code: 'ACCOUNT_SUSPENDED' },
  { pattern: /(deleted|видален|удален)/i, code: 'ACCOUNT_DELETED' },
];

function isTechnicalErrorMessage(message) {
  if (typeof message !== 'string') return true;
  const trimmed = message.trim();
  if (!trimmed) return true;
  return TECHNICAL_MESSAGE_PATTERNS.some((re) => re.test(trimmed));
}

function extractErrorPayload(error) {
  if (!error) return null;
  if (error.response?.data != null) return error.response.data;
  if (error.data != null) return error.data;
  return null;
}

function pickFirstString(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const picked = pickFirstString(item);
      if (picked) return picked;
    }
  }
  if (value && typeof value === 'object') {
    if (typeof value.message === 'string' && value.message.trim()) {
      return value.message.trim();
    }
    if (typeof value.msg === 'string' && value.msg.trim()) {
      return value.msg.trim();
    }
  }
  return null;
}

function extractCode(payload, error) {
  const code = payload?.code;
  if (typeof code === 'string' && code.trim()) return code.trim();
  if (typeof error?.code === 'string' && error.code.trim() && error.code !== 'ERR_BAD_REQUEST') {
    return error.code.trim();
  }
  return null;
}

function extractServerMessage(payload) {
  if (!payload) return null;
  if (typeof payload === 'string' && payload.trim()) return payload.trim();
  return pickFirstString(payload.message) || pickFirstString(payload.error);
}

function inferCodeFromMessage(message) {
  if (!message) return null;
  for (const hint of MESSAGE_CODE_HINTS) {
    if (hint.pattern.test(message)) return hint.code;
  }
  return null;
}

function translateErrorCode(code) {
  const key = `errors.${code}`;
  if (i18n.exists(key)) return i18n.t(key);
  return null;
}

function isNetworkError(error) {
  if (!error || error.response) return false;
  const code = String(error.code || '');
  if (code === 'ERR_NETWORK' || code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
    return true;
  }
  return error.message === 'Network Error';
}

function resolveErrorCode(payload, error) {
  let code = extractCode(payload, error);
  const serverMessage = extractServerMessage(payload);

  if (code === 'CONFLICT' && serverMessage) {
    const inferred = inferCodeFromMessage(serverMessage);
    if (inferred) return inferred;
  }

  if (!code && serverMessage) {
    code = inferCodeFromMessage(serverMessage);
  }

  return code || '';
}

/**
 * Stable API error code from axios / store error object.
 */
export function getApiErrorCode(error) {
  if (isNetworkError(error)) return 'NETWORK_ERROR';
  const payload = extractErrorPayload(error);
  return resolveErrorCode(payload, error);
}

/**
 * User-facing error text from axios response.
 * Prefers stable `code` from API for i18n; filters technical messages.
 */
export function getApiErrorMessage(error, fallbackKey = 'errors.generic') {
  if (!error) return i18n.t(fallbackKey);

  if (isNetworkError(error)) {
    return translateErrorCode('NETWORK_ERROR') || i18n.t(fallbackKey);
  }

  const payload = extractErrorPayload(error);
  const serverMessage = extractServerMessage(payload);
  let code = resolveErrorCode(payload, error);

  if (code === 'VALIDATION_ERROR') {
    if (serverMessage && !isTechnicalErrorMessage(serverMessage)) {
      return serverMessage;
    }
    return translateErrorCode(code) || i18n.t(fallbackKey);
  }

  // Legacy 409 without specific code: infer from message (e.g. duplicate email).
  if (code === 'CONFLICT' && serverMessage) {
    const inferred = inferCodeFromMessage(serverMessage);
    if (inferred) {
      const translated = translateErrorCode(inferred);
      if (translated) return translated;
    }
  }

  if (code) {
    const translated = translateErrorCode(code);
    if (translated) return translated;
  }

  if (serverMessage && !isTechnicalErrorMessage(serverMessage)) {
    return serverMessage;
  }

  const errMessage = typeof error.message === 'string' ? error.message.trim() : '';
  if (errMessage && !isTechnicalErrorMessage(errMessage)) {
    return errMessage;
  }

  return i18n.t(fallbackKey);
}

/**
 * Username suggestions from API error body (complete/update profile or check endpoint).
 */
export function getApiErrorSuggestions(error) {
  const payload = extractErrorPayload(error);
  if (!payload || typeof payload !== 'object') return [];

  if (Array.isArray(payload.suggestions)) {
    return payload.suggestions.filter(
      (item) => typeof item === 'string' && item.trim().length > 0,
    );
  }

  if (
    payload.details &&
    typeof payload.details === 'object' &&
    Array.isArray(payload.details.suggestions)
  ) {
    return payload.details.suggestions.filter(
      (item) => typeof item === 'string' && item.trim().length > 0,
    );
  }

  return [];
}
