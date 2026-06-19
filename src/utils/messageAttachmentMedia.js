const EXT_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  webm_audio: 'audio/webm',
};

function extensionFromName(name) {
  const base = String(name || '').trim().toLowerCase();
  const idx = base.lastIndexOf('.');
  if (idx <= 0) return '';
  return base.slice(idx + 1);
}

export function inferMimeFromFileName(fileName) {
  const ext = extensionFromName(fileName);
  if (!ext) return null;
  if (ext === 'webm') return null;
  return EXT_TO_MIME[ext] || null;
}

export function resolveFileMime(file) {
  const type = String(file?.type || '').trim().toLowerCase();
  if (type && type !== 'application/octet-stream') return type;
  return inferMimeFromFileName(file?.name) || type || 'application/octet-stream';
}

export function normalizeAttachment(att = {}, messageType) {
  const url = att.url || att.fileUrl || att.secure_url || att.file_url || '';
  const mimeType =
    att.mimeType ||
    att.mime_type ||
    inferMimeFromFileName(att.fileName || att.file_name) ||
    inferMimeFromMessageType(messageType) ||
    '';

  return {
    ...att,
    url,
    fileName: att.fileName || att.file_name,
    mimeType,
  };
}

function inferMimeFromMessageType(messageType) {
  switch (String(messageType || '').toUpperCase()) {
    case 'IMAGE':
      return 'image/jpeg';
    case 'VIDEO':
      return 'video/mp4';
    case 'AUDIO':
      return 'audio/mpeg';
    default:
      return '';
  }
}

export function inferMediaKind({ mimeType, url, messageType }) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';

  const fromUrl = inferKindFromCloudinaryUrl(url);
  if (fromUrl) return fromUrl;

  const fromType = String(messageType || '').toUpperCase();
  if (fromType === 'IMAGE') return 'image';
  if (fromType === 'VIDEO') return 'video';
  if (fromType === 'AUDIO') return 'audio';

  const fromName = inferMimeFromFileName(
    typeof url === 'string' ? url.split('/').pop() : '',
  );
  if (fromName?.startsWith('image/')) return 'image';
  if (fromName?.startsWith('video/')) return 'video';
  if (fromName?.startsWith('audio/')) return 'audio';

  return 'file';
}

function inferKindFromCloudinaryUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (/\/image\/upload\//.test(url)) return 'image';
  if (/\/video\/upload\//.test(url)) return 'video';
  if (/\/raw\/upload\//.test(url)) {
    const mime = inferMimeFromFileName(url.split('/').pop()?.split('?')[0]);
    if (mime?.startsWith('image/')) return 'image';
    if (mime?.startsWith('video/')) return 'video';
    if (mime?.startsWith('audio/')) return 'audio';
  }
  return null;
}

/** Prefer browser-friendly Cloudinary delivery for chat previews. */
export function cloudinaryAttachmentDisplayUrl(url, kind = 'image') {
  if (!url || kind !== 'image' || !/res\.cloudinary\.com/i.test(url)) return url;
  if (url.includes('/f_auto') || url.includes('/q_auto')) return url;

  if (url.includes('/raw/upload/')) {
    return url.replace('/raw/upload/', '/image/upload/f_auto,q_auto/').split('?')[0];
  }

  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const prefix = url.slice(0, idx + marker.length);
  const suffix = url.slice(idx + marker.length).split('?')[0];
  return `${prefix}f_auto,q_auto/${suffix}`;
}
