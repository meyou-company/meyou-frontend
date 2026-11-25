import { resolveFileMime } from './messageAttachmentMedia';

/** Client may accept up to 50MB; backend presign / Cloudinary path stays at 10MB. */
export const CHAT_IMAGE_MAX_INPUT_BYTES = 50 * 1024 * 1024;
export const CHAT_IMAGE_MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
export const CHAT_IMAGE_TARGET_MAX_BYTES = 5 * 1024 * 1024;
export const CHAT_IMAGE_MAX_LONG_EDGE = 2560;

export class ChatImageUploadError extends Error {
  /** @param {string} code i18n key under `errors.<code>` */
  constructor(code) {
    super(code);
    this.name = 'ChatImageUploadError';
    this.code = code;
  }
}

export function isChatImageMime(mime) {
  return String(mime || '').toLowerCase().startsWith('image/');
}

export function isHeicLike(mime, fileName) {
  const m = String(mime || '').toLowerCase();
  if (m === 'image/heic' || m === 'image/heif') return true;
  const ext = String(fileName || '')
    .split('.')
    .pop()
    ?.toLowerCase();
  return ext === 'heic' || ext === 'heif';
}

/** Graphic control extension 0x21 0xF9 — more than one frame ⇒ animated GIF. */
export function isAnimatedGifBuffer(buffer) {
  const view = new Uint8Array(buffer);
  let graphicControls = 0;
  for (let i = 0; i < view.length - 1; i += 1) {
    if (view[i] === 0x21 && view[i + 1] === 0xf9) {
      graphicControls += 1;
      if (graphicControls > 1) return true;
    }
  }
  return false;
}

export function shouldPrepareChatImage(file, mime = resolveFileMime(file)) {
  if (!isChatImageMime(mime)) return false;
  if (isHeicLike(mime, file?.name)) return true;
  if (file.size > CHAT_IMAGE_MAX_OUTPUT_BYTES) return true;
  return false;
}

async function readFileArrayBuffer(file) {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }
  return new Response(file).arrayBuffer();
}

function yieldToMain() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function outputFileName(originalName, ext) {
  const base = String(originalName || 'photo')
    .replace(/\.[^.]+$/i, '')
    .slice(0, 120);
  return `${base || 'photo'}-optimized.${ext}`;
}

function fileFromBlob(blob, name, type) {
  return new File([blob], name, {
    type,
    lastModified: Date.now(),
  });
}

async function decodeToBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, {
      imageOrientation: 'from-image',
      premultiplyAlpha: 'none',
    });
  }
  return decodeViaImageElement(file);
}

function decodeViaImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      createImageBitmap(canvas)
        .then(resolve)
        .catch(reject);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });
}

function canvasHasTransparency(ctx, width, height) {
  const sampleW = Math.min(width, 96);
  const sampleH = Math.min(height, 96);
  const data = ctx.getImageData(0, 0, sampleW, sampleH).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob'))),
      mime,
      quality,
    );
  });
}

async function encodeUnderLimits(canvas, preferPng, originalName) {
  if (preferPng) {
    const pngBlob = await canvasToBlob(canvas, 'image/png');
    const pngFile = fileFromBlob(
      pngBlob,
      outputFileName(originalName, 'png'),
      'image/png',
    );
    if (pngFile.size <= CHAT_IMAGE_MAX_OUTPUT_BYTES) {
      return pngFile;
    }
  }

  let quality = 0.88;
  let lastFile = null;
  while (quality >= 0.52) {
    const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', quality);
    const jpegFile = fileFromBlob(
      jpegBlob,
      outputFileName(originalName, 'jpg'),
      'image/jpeg',
    );
    lastFile = jpegFile;
    if (jpegFile.size <= CHAT_IMAGE_TARGET_MAX_BYTES) {
      return jpegFile;
    }
    if (jpegFile.size <= CHAT_IMAGE_MAX_OUTPUT_BYTES && quality <= 0.6) {
      return jpegFile;
    }
    quality -= 0.06;
  }

  if (lastFile && lastFile.size <= CHAT_IMAGE_MAX_OUTPUT_BYTES) {
    return lastFile;
  }
  throw new ChatImageUploadError('CHAT_IMAGE_TOO_LARGE_OUTPUT');
}

function assertOutputSize(file) {
  if (file.size > CHAT_IMAGE_MAX_OUTPUT_BYTES) {
    throw new ChatImageUploadError('CHAT_IMAGE_TOO_LARGE_OUTPUT');
  }
}

/**
 * Resize / re-encode chat photos client-side before presign. Videos and documents are untouched.
 * @param {File} file
 * @param {{ onProgress?: (phase: 'decode' | 'optimize') => void }} [options]
 * @returns {Promise<File>}
 */
export async function prepareChatImageForUpload(file, { onProgress } = {}) {
  const mime = resolveFileMime(file);
  if (!isChatImageMime(mime)) {
    throw new ChatImageUploadError('CHAT_IMAGE_INVALID');
  }
  if (file.size > CHAT_IMAGE_MAX_INPUT_BYTES) {
    throw new ChatImageUploadError('CHAT_IMAGE_TOO_LARGE_INPUT');
  }

  const lowered = mime.toLowerCase();
  if (lowered.includes('svg')) {
    throw new ChatImageUploadError('CHAT_IMAGE_INVALID');
  }

  if (lowered === 'image/gif') {
    const buffer = await readFileArrayBuffer(file);
    if (isAnimatedGifBuffer(buffer)) {
      if (file.size <= CHAT_IMAGE_MAX_OUTPUT_BYTES) {
        return file;
      }
      throw new ChatImageUploadError('CHAT_IMAGE_GIF_TOO_LARGE');
    }
  }

  if (!shouldPrepareChatImage(file, mime)) {
    assertOutputSize(file);
    return file;
  }

  await yieldToMain();
  onProgress?.('decode');

  let bitmap;
  try {
    bitmap = await decodeToBitmap(file);
  } catch {
    throw new ChatImageUploadError('CHAT_IMAGE_OPTIMIZE_FAILED');
  }

  const longEdge = Math.max(bitmap.width, bitmap.height);
  const scale =
    longEdge > CHAT_IMAGE_MAX_LONG_EDGE ? CHAT_IMAGE_MAX_LONG_EDGE / longEdge : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  await yieldToMain();
  onProgress?.('optimize');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    bitmap.close?.();
    throw new ChatImageUploadError('CHAT_IMAGE_OPTIMIZE_FAILED');
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const preferPng =
    (lowered === 'image/png' || lowered === 'image/webp' || lowered === 'image/gif') &&
    canvasHasTransparency(ctx, width, height);

  let optimized;
  try {
    optimized = await encodeUnderLimits(canvas, preferPng, file.name);
  } catch (err) {
    if (err instanceof ChatImageUploadError) throw err;
    throw new ChatImageUploadError('CHAT_IMAGE_OPTIMIZE_FAILED');
  }

  assertOutputSize(optimized);
  return optimized;
}