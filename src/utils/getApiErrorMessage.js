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
  { pattern: /phone.*(already|exists|taken|busy|conflict)/i, code: 'PHONE_ALREADY_EXISTS' },
  { pattern: /(already|exists|taken|busy|conflict).*phone/i, code: 'PHONE_ALREADY_EXISTS' },
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
  { pattern: /^CITY_NAME_INVALID$/i, code: 'CITY_NAME_INVALID' },
  { pattern: /^CITY_NAME_TOO_LONG$/i, code: 'CITY_NAME_TOO_LONG' },
  { pattern: /^PERSON_NAME_INVALID$/i, code: 'PERSON_NAME_INVALID' },
  { pattern: /^POST_FULL_TEXT_TOO_LONG$/i, code: 'POST_FULL_TEXT_TOO_LONG' },
  { pattern: /^LUNA_MESSAGE_EMPTY$/i, code: 'LUNA_MESSAGE_EMPTY' },
  { pattern: /^LUNA_MESSAGE_TOO_LONG$/i, code: 'LUNA_MESSAGE_TOO_LONG' },
  { pattern: /^LUNA_APPEARANCE_REQUIRED$/i, code: 'LUNA_APPEARANCE_REQUIRED' },
  { pattern: /^LUNA_DAILY_LIMIT$/i, code: 'LUNA_DAILY_LIMIT' },
  { pattern: /^LUNA_MONTHLY_LIMIT$/i, code: 'LUNA_MONTHLY_LIMIT' },
  { pattern: /^LUNA_BUDGET_EXCEEDED$/i, code: 'LUNA_BUDGET_EXCEEDED' },
  { pattern: /^LUNA_BUSY$/i, code: 'LUNA_BUSY' },
  { pattern: /^LUNA_MEDIA_UNAVAILABLE$/i, code: 'LUNA_MEDIA_UNAVAILABLE' },
  { pattern: /^LUNA_IMAGE_INVALID$/i, code: 'LUNA_IMAGE_INVALID' },
  { pattern: /^LUNA_IMAGE_TOO_LARGE$/i, code: 'LUNA_IMAGE_TOO_LARGE' },
  { pattern: /^LUNA_AUDIO_INVALID$/i, code: 'LUNA_AUDIO_INVALID' },
  { pattern: /^LUNA_AUDIO_TOO_LONG$/i, code: 'LUNA_AUDIO_TOO_LONG' },
  { pattern: /^LUNA_CONVERSATION_NOT_FOUND$/i, code: 'LUNA_CONVERSATION_NOT_FOUND' },
  { pattern: /^LUNA_OPENAI_RATE_LIMIT$/i, code: 'LUNA_OPENAI_RATE_LIMIT' },
  { pattern: /^LUNA_OPENAI_INSUFFICIENT_QUOTA$/i, code: 'LUNA_OPENAI_INSUFFICIENT_QUOTA' },
  { pattern: /^LUNA_OPENAI_CONFIG_ERROR$/i, code: 'LUNA_OPENAI_CONFIG_ERROR' },
  { pattern: /^LUNA_AI_UNAVAILABLE$/i, code: 'LUNA_AI_UNAVAILABLE' },
  { pattern: /^LUNA_NETWORK_ERROR$/i, code: 'LUNA_NETWORK_ERROR' },
  { pattern: /^LUNA_TIMEOUT$/i, code: 'LUNA_TIMEOUT' },
  { pattern: /^LUNA_UPLOAD_FAILED$/i, code: 'LUNA_UPLOAD_FAILED' },
  { pattern: /^LUNA_MESSAGE_SAVE_FAILED$/i, code: 'LUNA_MESSAGE_SAVE_FAILED' },
  { pattern: /^LUNA_REQUEST_IN_PROGRESS$/i, code: 'LUNA_REQUEST_IN_PROGRESS' },
  { pattern: /название города|назва міста/i, code: 'CITY_NAME_INVALID' },
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

function payloadMentionsPhone(payload) {
  if (!payload) return false;
  try {
    return JSON.stringify(payload).toLowerCase().includes('phone');
  } catch {
    return false;
  }
}

function parseRetryAfterHeader(headers) {
  if (!headers || typeof headers !== 'object') return null;
  const raw = headers['retry-after'] ?? headers['Retry-After'];
  if (raw == null || raw === '') return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
  return null;
}

function resolveRetryAfterSeconds(error, details) {
  const fromDetails = Number(details?.retryAfterSeconds);
  if (Number.isFinite(fromDetails) && fromDetails > 0) {
    return Math.ceil(fromDetails);
  }
  if (error) {
    const fromGetter = getRetryAfterSeconds(error);
    if (fromGetter) return fromGetter;
  }
  return null;
}

function translateErrorCode(code, details, error) {
  const key = `errors.${code}`;
  if (!i18n.exists(key)) return null;

  const retrySec = resolveRetryAfterSeconds(error, details);
  if (code === 'RATE_LIMITED' && retrySec) {
    const retryKey = 'errors.RATE_LIMITED_RETRY';
    if (i18n.exists(retryKey)) {
      return i18n.t(retryKey, { seconds: retrySec });
    }
  }

  if (retrySec) {
    return i18n.t(key, { seconds: retrySec });
  }
  return i18n.t(key);
}

function readErrorDetails(error) {
  const payload = extractErrorPayload(error);
  const raw = payload?.details;
  if (typeof raw === 'object' && raw !== null) return raw;
  return {};
}

/**
 * Safe Luna send metadata from API error body.
 */
export function getLunaErrorMeta(error) {
  const details = readErrorDetails(error);
  const payload = extractErrorPayload(error);
  const code = error ? resolveErrorCode(payload, error) : '';
  const retryable = details.retryable === true;
  const quotaRestored = details.quotaRestored === true;
  const retryAfterSeconds = resolveRetryAfterSeconds(error, details);
  const resetAt = typeof details.resetAt === 'string' ? details.resetAt : null;
  const requestState =
    typeof details.requestState === 'string' ? details.requestState : null;
  return {
    code,
    retryable,
    quotaRestored,
    retryAfterSeconds,
    resetAt,
    requestState,
  };
}

/** Manual Luna retry is allowed only when the backend marks the error retryable. */
export function isLunaRetryAllowed(error) {
  if (!error) return false;
  const { retryable, code } = getLunaErrorMeta(error);
  if (!retryable) return false;
  const blocked = new Set([
    'LUNA_DAILY_LIMIT',
    'LUNA_MONTHLY_LIMIT',
    'LUNA_BUDGET_EXCEEDED',
    'LUNA_OPENAI_INSUFFICIENT_QUOTA',
    'LUNA_OPENAI_CONFIG_ERROR',
    'LUNA_REQUEST_IN_PROGRESS',
  ]);
  if (blocked.has(code)) return false;
  return true;
}

export function getRetryAfterSeconds(error) {
  const payload = extractErrorPayload(error);
  const seconds = Number(payload?.details?.retryAfterSeconds);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);

  const headerSeconds = parseRetryAfterHeader(error?.response?.headers);
  if (headerSeconds) return headerSeconds;

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

  if ((code === 'CONFLICT' || error?.response?.status === 409 || error?.status === 409) && payloadMentionsPhone(payload)) {
    return 'PHONE_ALREADY_EXISTS';
  }

  if (code === 'CONFLICT' && serverMessage) {
    const inferred = inferCodeFromMessage(serverMessage);
    if (inferred) return inferred;
  }

  if (serverMessage) {
    const inferred = inferCodeFromMessage(serverMessage);
    if (inferred === 'CITY_NAME_INVALID' || inferred === 'CITY_NAME_TOO_LONG') {
      return inferred;
    }
    if (!code) {
      code = inferred;
    }
  }

  const httpStatus = error?.response?.status ?? error?.status;
  if (httpStatus === 429 && (!code || code === 'ERR_BAD_REQUEST')) {
    return 'RATE_LIMITED';
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
    return translateErrorCode('NETWORK_ERROR', null, error) || i18n.t(fallbackKey);
  }

  const payload = extractErrorPayload(error);
  const serverMessage = extractServerMessage(payload);
  let code = resolveErrorCode(payload, error);

  if (code === 'VALIDATION_ERROR') {
    const inferred = inferCodeFromMessage(serverMessage);
    if (inferred) {
      const translated = translateErrorCode(inferred, payload?.details, error);
      if (translated) return translated;
    }
    if (serverMessage && !isTechnicalErrorMessage(serverMessage)) {
      return serverMessage;
    }
    return translateErrorCode(code, payload?.details, error) || i18n.t(fallbackKey);
  }

  // Legacy 409 without specific code: infer from message (e.g. duplicate email).
  if (code === 'CONFLICT' && serverMessage) {
    const inferred = inferCodeFromMessage(serverMessage);
    if (inferred) {
      const translated = translateErrorCode(inferred, payload?.details, error);
      if (translated) return translated;
    }
  }

  if (code === 'ACCOUNT_SUSPENDED') {
    const details = readErrorDetails(error);
    if (details.indefinite) {
      const indefinite = translateErrorCode('ACCOUNT_SUSPENDED_INDEFINITE', details, error);
      if (indefinite) return indefinite;
    }
    if (typeof details.suspendedUntil === 'string' && details.suspendedUntil) {
      let untilLabel = '';
      try {
        untilLabel = new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(details.suspendedUntil));
      } catch {
        untilLabel = details.suspendedUntil;
      }
      const tempKey = 'errors.ACCOUNT_SUSPENDED_TEMP';
      if (i18n.exists(tempKey)) {
        return i18n.t(tempKey, { until: untilLabel ? ` (${untilLabel})` : '' });
      }
    }
  }

  if (code) {
    const translated = translateErrorCode(code, payload?.details, error);
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

const CLIENT_UPLOAD_ERROR_CODES = new Set([
  'CHAT_IMAGE_TOO_LARGE_INPUT',
  'CHAT_IMAGE_TOO_LARGE_OUTPUT',
  'CHAT_IMAGE_GIF_TOO_LARGE',
  'CHAT_IMAGE_OPTIMIZE_FAILED',
  'CHAT_IMAGE_INVALID',
  'CHAT_VIDEO_TOO_LARGE',
  'CHAT_AUDIO_TOO_LARGE',
  'CHAT_FILE_TOO_LARGE',
]);

/** User-facing text for presign / Cloudinary upload failures. */
export function getMediaUploadErrorMessage(error, fallbackKey = 'errors.MEDIA_UPLOAD_FAILED') {
  const code =
    typeof error?.code === 'string'
      ? error.code.trim()
      : typeof error?.message === 'string' && CLIENT_UPLOAD_ERROR_CODES.has(error.message.trim())
        ? error.message.trim()
        : '';

  if (code && CLIENT_UPLOAD_ERROR_CODES.has(code) && i18n.exists(`errors.${code}`)) {
    return i18n.t(`errors.${code}`);
  }

  return getApiErrorMessage(error, fallbackKey);
}
