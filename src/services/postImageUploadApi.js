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
    payload.signedUrl,
    payload.presignedUrl,
    payload.url,
    payload.data?.uploadUrl,
    payload.data?.signedUrl,
    payload.data?.presignedUrl,
    payload.data?.url
  );
}

/**
 * Public file URL after upload (without query params).
 * Backend can return this directly; if not, derive from upload target URL.
 */
function extractPublicMediaUrl(payload, uploadTargetUrl) {
  const fromPayload = firstString(
    payload?.fileUrl,
    payload?.finalUrl,
    payload?.publicUrl,
    payload?.mediaUrl,
    payload?.imageUrl,
    payload?.cdnUrl,
    payload?.data?.fileUrl,
    payload?.data?.finalUrl,
    payload?.data?.publicUrl,
    payload?.data?.mediaUrl,
    payload?.data?.imageUrl,
    payload?.data?.cdnUrl
  );
  if (fromPayload) return fromPayload;
  if (!uploadTargetUrl) return null;
  const queryIndex = uploadTargetUrl.indexOf("?");
  return queryIndex >= 0 ? uploadTargetUrl.slice(0, queryIndex) : uploadTargetUrl;
}

/**
 * Upload media using presigned URL flow:
 * 1) GET /uploads/post-media/presigned-url
 * 2) PUT file to uploadUrl
 * 3) return public file URL for POST /posts.imageUrl
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

  const signedUrl = extractSignedUrl(data);
  if (!signedUrl) {
    throw new Error(
      "Signed upload URL is missing. Backend should return signedUrl."
    );
  }
  const publicUrl = extractPublicMediaUrl(data, null);
  if (!publicUrl) throw new Error("Public file URL is missing in upload-url response.");

  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });
  if (!uploadRes.ok) {
    throw new Error(`Media upload failed: ${uploadRes.status}`);
  }

  return publicUrl;
}
