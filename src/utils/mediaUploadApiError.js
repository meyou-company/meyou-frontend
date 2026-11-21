/**
 * Helpers for presign + Cloudinary upload flows (SEC-009).
 * Presign failures should propagate axios errors unchanged so RATE_LIMITED / Retry-After stay intact.
 */

export function isAxiosLikePresignError(error) {
  return Boolean(error?.response?.status || error?.isAxiosError);
}

/**
 * @param {Response} uploadRes
 * @param {object | null} cloudBody
 */
export function createCloudinaryUploadError(uploadRes, cloudBody) {
  const status = Number(uploadRes?.status) || 0;
  const code = status >= 500 ? 'MEDIA_UPLOAD_FAILED' : 'MEDIA_UPLOAD_CLOUDINARY_FAILED';
  const message =
    (cloudBody?.error?.message && String(cloudBody.error.message).trim()) ||
    `${status} ${uploadRes?.statusText || ''}`.trim();

  const err = new Error(message || code);
  err.response = {
    status: status >= 500 ? 500 : status,
    data: {
      code,
      message,
    },
  };
  return err;
}

export function throwCloudinaryUploadError(uploadRes, cloudBody) {
  throw createCloudinaryUploadError(uploadRes, cloudBody);
}

export function createMediaUploadNetworkError() {
  const err = new Error('Network Error');
  err.code = 'ERR_NETWORK';
  return err;
}