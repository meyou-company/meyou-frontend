import { api, apiPath } from './api';
import { resolveFileMime } from '../utils/messageAttachmentMedia';
import { throwCloudinaryUploadError } from '../utils/mediaUploadApiError.js';
import {
  CHAT_IMAGE_MAX_OUTPUT_BYTES,
  ChatImageUploadError,
  prepareChatImageForUpload,
} from '../utils/chatImageOptimize';

export const MESSAGE_IMAGE_MAX_BYTES = CHAT_IMAGE_MAX_OUTPUT_BYTES;
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
  const fromCloud = cloudinaryJsonResponse && typeof cloudinaryJsonResponse === 'object'
    ? firstString(cloudinaryJsonResponse.secure_url, cloudinaryJsonResponse.url)
    : null;
  if (fromCloud) return fromCloud.split('?')[0];

  const fromPayload = firstString(
    payload?.fileUrl,
    payload?.file_url,
    payload?.secure_url,
    payload?.data?.fileUrl,
    payload?.data?.secure_url,
  );
  return fromPayload ? fromPayload.split('?')[0] : null;
}

function presignKindForFile(file) {
  const type = resolveFileMime(file);
  if (type.startsWith('image/')) return 'media';
  if (type.startsWith('video/')) return 'media';
  if (type.startsWith('audio/')) return 'media';
  return 'file';
}

function fileTypeParam(file) {
  const type = resolveFileMime(file);
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return 'image';
}

function validateNonImageFileSize(file) {
  const type = resolveFileMime(file);
  if (type.startsWith('video/') && file.size > MAX_VIDEO_BYTES) {
    throw new Error('CHAT_VIDEO_TOO_LARGE');
  }
  if (type.startsWith('audio/') && file.size > MAX_AUDIO_BYTES) {
    throw new Error('CHAT_AUDIO_TOO_LARGE');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('CHAT_FILE_TOO_LARGE');
  }
}

function validateChatImageOutputSize(file) {
  if (file.size > MESSAGE_IMAGE_MAX_BYTES) {
    throw new ChatImageUploadError('CHAT_IMAGE_TOO_LARGE_OUTPUT');
  }
}

async function resolveUploadFile(file, options) {
  const type = resolveFileMime(file);
  if (!type.startsWith('image/')) {
    validateNonImageFileSize(file);
    return file;
  }
  const prepared = await prepareChatImageForUpload(file, {
    onProgress: (phase) => options?.onImagePrepare?.(phase),
  });
  validateChatImageOutputSize(prepared);
  return prepared;
}

async function uploadViaPresigned(file, presignPath, options) {
  const uploadFile = await resolveUploadFile(file, options);

  const { data } = await api.get(apiPath(presignPath), {
    params: {
      fileName: uploadFile.name || `message-${Date.now()}`,
      fileType: fileTypeParam(uploadFile),
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
  formData.append('file', uploadFile);

  const uploadRes = await fetch(uploadUrl, { method: 'POST', body: formData });
  let cloudBody = null;
  try {
    cloudBody = await uploadRes.json();
  } catch {
    /* ignore */
  }

  if (!uploadRes.ok) {
    throwCloudinaryUploadError(uploadRes, cloudBody);
  }

  const publicUrl = extractPublicMediaUrl(data, cloudBody);
  if (!publicUrl) throw new Error('Upload succeeded but URL is missing');
  return { url: publicUrl, file: uploadFile };
}

/**
 * @param {File} file
 * @param {{ onImagePrepare?: (phase: 'decode' | 'optimize') => void }} [options]
 * @returns {Promise<{ url: string, file: File }>}
 */
export async function uploadMessageMedia(file, options) {
  if (!file) throw new Error('No file provided');
  const kind = presignKindForFile(file);
  if (kind === 'file') {
    return uploadViaPresigned(file, '/uploads/message-files/presigned-url', options);
  }
  return uploadViaPresigned(file, '/uploads/message-media/presigned-url', options);
}

export function buildAttachmentFromFile(file, url) {
  return {
    url,
    mimeType: resolveFileMime(file),
    fileName: file.name || undefined,
    size: file.size,
  };
}

export function inferMessageTypeFromFile(file) {
  const type = resolveFileMime(file);
  if (type.startsWith('image/')) return 'IMAGE';
  if (type.startsWith('video/')) return 'VIDEO';
  if (type.startsWith('audio/')) return 'AUDIO';
  return 'FILE';
}
