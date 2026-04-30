import { api } from "./api";

/**
 * Post image upload is optional. Only call the backend upload route when
 * VITE_ENABLE_POST_IMAGE_UPLOAD === "true".
 */
export function isPostImageUploadEnabled() {
  const flag = import.meta.env.VITE_ENABLE_POST_IMAGE_UPLOAD;
  // Enabled by default for presigned flow; disable only with explicit "false".
  return flag !== "false";
}

const UPLOAD_URL_PATH =
  import.meta.env.VITE_POST_IMAGE_UPLOAD_PATH ||
  "/uploads/post-media/presigned-url";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Optional: direct unsigned upload (preset must allow unsigned in Cloudinary). */
const UNSIGNED_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim();
const UNSIGNED_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim();

function firstString(...values) {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function extractSignedUrl(payload) {
  if (!payload || typeof payload !== "object") return null;
  return firstString(
    payload.uploadUrl,
    payload.upload_url,
    payload.signedUrl,
    payload.presignedUrl,
    payload.url,
    payload.data?.uploadUrl,
    payload.data?.upload_url,
    payload.data?.signedUrl,
    payload.data?.presignedUrl,
    payload.data?.url
  );
}

/**
 * Cloudinary-signed POST multipart uses snake_case: api_key, timestamp, signature, folder, public_id.
 */
function extractUploadFields(payload) {
  if (!payload || typeof payload !== "object") return null;
  const root = payload.uploadFields ?? payload.upload_fields;
  if (root && typeof root === "object") return root;

  const api_key = payload.api_key;
  const timestamp = payload.timestamp;
  const signature = payload.signature;
  const folder = payload.folder;
  const public_id = payload.public_id;
  if (
    api_key &&
    signature != null &&
    timestamp != null &&
    folder &&
    public_id
  ) {
    return { api_key, timestamp, signature, folder, public_id };
  }
  return null;
}

function appendFormFields(formData, fields) {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    formData.append(key, String(value));
  }
}

/**
 * Public file URL after upload (without query params).
 * Backend can return this directly; after Cloudinary POST, use JSON `secure_url`.
 */
function extractPublicMediaUrl(payload, cloudinaryJsonResponse) {
  const fromPayload = firstString(
    payload?.fileUrl,
    payload?.file_url,
    payload?.secure_url,
    payload?.finalUrl,
    payload?.publicUrl,
    payload?.mediaUrl,
    payload?.imageUrl,
    payload?.cdnUrl,
    payload?.data?.fileUrl,
    payload?.data?.file_url,
    payload?.data?.secure_url,
    payload?.data?.finalUrl,
    payload?.data?.publicUrl,
    payload?.data?.mediaUrl,
    payload?.data?.imageUrl,
    payload?.data?.cdnUrl
  );
  if (fromPayload) return fromPayload;

  const fromCloud = cloudinaryJsonResponse && typeof cloudinaryJsonResponse === "object"
    ? firstString(
        cloudinaryJsonResponse.secure_url,
        cloudinaryJsonResponse.url
      )
    : null;
  if (fromCloud) return fromCloud.split("?")[0];

  return null;
}

/**
 * Upload via Cloudinary REST: POST `multipart/form-data` with `file` + preset (unsigned).
 * Preset must exist and have unsigned uploads allowed in Cloudinary console.
 */
async function uploadUnsignedToCloudinary(file) {
  if (!UNSIGNED_CLOUD_NAME || !UNSIGNED_UPLOAD_PRESET) {
    throw new Error(
      "Unsigned Cloudinary upload: set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET (preset must allow unsigned)."
    );
  }
  const uploadUrl = `https://api.cloudinary.com/v1_1/${UNSIGNED_CLOUD_NAME}/image/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UNSIGNED_UPLOAD_PRESET);

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  let body = null;
  try {
    body = await uploadRes.json();
  } catch (_) {
    /* ignore */
  }

  if (!uploadRes.ok) {
    const msg =
      body?.error?.message ??
      `${uploadRes.status} ${uploadRes.statusText}`;
    throw new Error(`Media upload failed: ${msg}`);
  }

  const url =
    typeof body?.secure_url === "string"
      ? body.secure_url
      : typeof body?.url === "string"
        ? body.url
        : null;
  if (!url) throw new Error("Cloudinary response missing secure_url");
  return url.split("?")[0];
}

/**
 * Upload media using presigned Cloudinary POST (multipart).
 * 1) GET `/uploads/post-media/presigned-url` (authenticated)
 * 2) POST `uploadUrl` as multipart/form-data: `upload_fields` + `file`
 * 3) return public CDN URL (`fileUrl` from API or Cloudinary JSON)
 * @returns {Promise<string>} public image URL
 */
export async function uploadPostImage(file) {
  if (!file) throw new Error("No media file provided");
  if (!file.type) throw new Error("File type is required for image upload");
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are supported");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Image size must be 5MB or less");
  }

  const useUnsignedOnly =
    import.meta.env.VITE_CLOUDINARY_USE_UNSIGNED_UPLOAD === "true";

  if (useUnsignedOnly) {
    return uploadUnsignedToCloudinary(file);
  }

  const ext = (file.name?.split(".").pop() || "").trim().toLowerCase() || "jpg";
  const fileName = file.name && file.name.includes(".")
    ? file.name
    : `post-${Date.now()}.${ext}`;

  const { data } = await api.get(UPLOAD_URL_PATH, {
    params: {
      fileName,
      fileType: file.type,
    },
  });

  const uploadUrl = extractSignedUrl(data);
  if (!uploadUrl) {
    throw new Error(
      "Upload URL is missing. Backend should return uploadUrl / upload_url."
    );
  }

  const uploadFields = extractUploadFields(data);
  if (!uploadFields) {
    throw new Error(
      "Upload form fields missing. Expected upload_fields (api_key, timestamp, signature, folder, public_id). For unsigned-only flow set VITE_CLOUDINARY_USE_UNSIGNED_UPLOAD=true and VITE_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const formData = new FormData();
  appendFormFields(formData, uploadFields);
  formData.append("file", file);

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  let cloudBody = null;
  try {
    cloudBody = await uploadRes.json();
  } catch (_) {
    /* non-JSON body */
  }

  if (!uploadRes.ok) {
    const msg =
      cloudBody?.error?.message ??
      `${uploadRes.status} ${uploadRes.statusText}`;
    throw new Error(`Media upload failed: ${msg}`);
  }

  const publicUrl = extractPublicMediaUrl(data, cloudBody);
  if (!publicUrl) {
    throw new Error(
      "Public file URL missing: expected fileUrl in presign response or secure_url from Cloudinary."
    );
  }

  return publicUrl;
}
