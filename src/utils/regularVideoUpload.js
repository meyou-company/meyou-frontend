export const REGULAR_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const REGULAR_VIDEO_MAX_MB = 100;

export const REGULAR_VIDEO_ERROR = {
  REQUIRED: 'required',
  TYPE: 'type',
  TOO_LARGE: 'tooLarge',
  NETWORK: 'network',
  FAILED: 'failed',
  MISSING_URL: 'missingUrl',
};

const VIDEO_EXT_MIME = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  qt: 'video/quicktime',
  webm: 'video/webm',
};

export class RegularVideoUploadError extends Error {
  constructor(code, extras = {}) {
    super(code);
    this.name = 'RegularVideoUploadError';
    this.code = code;
    this.maxMb = extras.maxMb ?? REGULAR_VIDEO_MAX_MB;
    this.status = extras.status;
  }
}

export function resolveRegularVideoMime(file) {
  const raw = String(file?.type || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (raw.startsWith('video/')) return raw;

  const ext = String(file?.name || '')
    .split('.')
    .pop()
    .trim()
    .toLowerCase();
  if (VIDEO_EXT_MIME[ext]) return VIDEO_EXT_MIME[ext];

  return raw;
}

export function isRegularVideoFile(file) {
  return resolveRegularVideoMime(file).startsWith('video/');
}

export function prepareRegularVideoFile(file) {
  const mime = resolveRegularVideoMime(file);
  if (!file || !mime || file.type === mime) return file;
  return new File([file], file.name || `video-${Date.now()}.mp4`, {
    type: mime,
    lastModified: file.lastModified,
  });
}

export function getRegularVideoIssue(file) {
  if (!file) {
    return { code: REGULAR_VIDEO_ERROR.REQUIRED };
  }

  if (!isRegularVideoFile(file)) {
    return { code: REGULAR_VIDEO_ERROR.TYPE };
  }

  if (file.size > REGULAR_VIDEO_MAX_BYTES) {
    return { code: REGULAR_VIDEO_ERROR.TOO_LARGE, maxMb: REGULAR_VIDEO_MAX_MB };
  }

  return null;
}

export function assertRegularVideoFile(file) {
  const issue = getRegularVideoIssue(file);
  if (!issue) return prepareRegularVideoFile(file);
  throw new RegularVideoUploadError(issue.code, { maxMb: issue.maxMb });
}

export function getRegularVideoErrorMessage(error, t) {
  const code = error instanceof RegularVideoUploadError ? error.code : error?.code;
  if (
    code &&
    Object.values(REGULAR_VIDEO_ERROR).includes(code) &&
    typeof t === 'function'
  ) {
    return t(`video.upload.errors.${code}`, {
      maxMb: error.maxMb || REGULAR_VIDEO_MAX_MB,
    });
  }
  return null;
}

export function uploadFormDataWithProgress({
  url,
  formData,
  body,
  method = 'POST',
  headers,
  onProgress,
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);

    Object.entries(headers || {}).forEach(([key, value]) => {
      if (value != null) xhr.setRequestHeader(key, String(value));
    });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== 'function') return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onload = () => {
      let parsed = null;
      try {
        parsed = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        parsed = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(parsed);
        return;
      }

      reject(
        new RegularVideoUploadError(REGULAR_VIDEO_ERROR.FAILED, {
          status: xhr.status,
        }),
      );
    };

    xhr.onerror = () => {
      reject(new RegularVideoUploadError(REGULAR_VIDEO_ERROR.NETWORK));
    };
    xhr.onabort = () => {
      reject(new RegularVideoUploadError(REGULAR_VIDEO_ERROR.NETWORK));
    };

    xhr.send(formData || body || null);
  });
}
