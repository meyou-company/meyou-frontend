import { api, apiPath } from './api';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function firstString(...values) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function extractSignedUrl(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return firstString(
    payload.uploadUrl,
    payload.upload_url,
    payload.signedUrl,
    payload.presignedUrl,
    payload.url,
    payload.data?.uploadUrl,
    payload.data?.upload_url,
  );
}

function extractUploadFields(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload.uploadFields ?? payload.upload_fields;
  if (root && typeof root === 'object') return root;
  const { api_key, timestamp, signature, folder, public_id } = payload;
  if (api_key && signature != null && timestamp != null && folder && public_id) {
    return { api_key, timestamp, signature, folder, public_id };
  }
  return null;
}

function extractPublicMediaUrl(payload, cloudinaryJsonResponse) {
  const fromPayload = firstString(
    payload?.fileUrl,
    payload?.file_url,
    payload?.secure_url,
    payload?.data?.fileUrl,
    payload?.data?.secure_url,
  );
  if (fromPayload) return fromPayload;
  const fromCloud = cloudinaryJsonResponse && typeof cloudinaryJsonResponse === 'object'
    ? firstString(cloudinaryJsonResponse.secure_url, cloudinaryJsonResponse.url)
    : null;
  return fromCloud ? fromCloud.split('?')[0] : null;
}

function presignKindForFile(file) {
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('image/')) return 'media';
  if (type.startsWith('video/')) return 'media';
  if (type.startsWith('audio/')) return 'media';
  return 'file';
}

function fileTypeParam(file) {
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return 'image';
}

function validateFileSize(file) {
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('image/') && file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image must be 10MB or less');
  }
  if (type.startsWith('video/') && file.size > MAX_VIDEO_BYTES) {
    throw new Error('Video must be 50MB or less');
  }
  if (type.startsWith('audio/') && file.size > MAX_AUDIO_BYTES) {
    throw new Error('Audio must be 15MB or less');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('File must be 25MB or less');
  }
}

async function uploadViaPresigned(file, presignPath) {
  validateFileSize(file);

  const { data } = await api.get(apiPath(presignPath), {
    params: {
      fileName: file.name || `message-${Date.now()}`,
      fileType: fileTypeParam(file),
    },
  });

  const uploadUrl = extractSignedUrl(data);
  const uploadFields = extractUploadFields(data);
  if (!uploadUrl || !uploadFields) {
    throw new Error('Invalid presign response from server');
  }

  const formData = new FormData();
  for (const [key, value] of Object.entries(uploadFields)) {
    if (value != null) formData.append(key, String(value));
  }
  formData.append('file', file);

  const uploadRes = await fetch(uploadUrl, { method: 'POST', body: formData });
  let cloudBody = null;
  try {
    cloudBody = await uploadRes.json();
  } catch {
    /* ignore */
  }

  if (!uploadRes.ok) {
    const msg = cloudBody?.error?.message ?? `${uploadRes.status} ${uploadRes.statusText}`;
    throw new Error(`Upload failed: ${msg}`);
  }

  const publicUrl = extractPublicMediaUrl(data, cloudBody);
  if (!publicUrl) throw new Error('Upload succeeded but URL is missing');
  return publicUrl;
}

export async function uploadMessageMedia(file) {
  if (!file) throw new Error('No file provided');
  const kind = presignKindForFile(file);
  if (kind === 'file') {
    return uploadViaPresigned(file, '/uploads/message-files/presigned-url');
  }
  return uploadViaPresigned(file, '/uploads/message-media/presigned-url');
}

export function buildAttachmentFromFile(file, url) {
  return {
    url,
    mimeType: file.type || 'application/octet-stream',
    fileName: file.name || undefined,
    size: file.size,
  };
}

export function inferMessageTypeFromFile(file) {
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('image/')) return 'IMAGE';
  if (type.startsWith('video/')) return 'VIDEO';
  if (type.startsWith('audio/')) return 'AUDIO';
  return 'FILE';
}
