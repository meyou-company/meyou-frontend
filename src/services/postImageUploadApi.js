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

const PRESIGNED_PATH =
  import.meta.env.VITE_POST_IMAGE_UPLOAD_PATH ||
  "/uploads/post-media/presigned-url";

function firstString(...values) {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function extractUploadTarget(payload) {
  if (!payload || typeof payload !== "object") return null;
  return firstString(
    payload.uploadUrl,
    payload.presignedUrl,
    payload.signedUrl,
    payload.url,
    payload.data?.uploadUrl,
    payload.data?.presignedUrl,
    payload.data?.signedUrl,
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
    payload?.publicUrl,
    payload?.mediaUrl,
    payload?.imageUrl,
    payload?.cdnUrl,
    payload?.data?.fileUrl,
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
  if (!file.type) throw new Error("File type is required for media upload");

  const ext =
    file.type === "video/mp4"
      ? "mp4"
      : file.type === "video/webm"
        ? "webm"
        : file.type?.startsWith("video/")
          ? "mp4"
          : "jpg";
  const fileName = file.name || `post-${Date.now()}.${ext}`;
  const contentType = file.type || "application/octet-stream";
  const paramVariants = [
    { fileName, fileType: contentType },
    { fileName, contentType },
    { filename: fileName, contentType },
    { filename: fileName, fileType: contentType },
    { fileName, mimeType: contentType },
  ];

  let data;
  let presignError;
  for (const params of paramVariants) {
    try {
      const res = await api.get(PRESIGNED_PATH, { params });
      data = res.data;
      break;
    } catch (e) {
      presignError = e;
    }
  }
  if (!data) throw presignError || new Error("Failed to get presigned URL");

  const uploadTargetUrl = extractUploadTarget(data);
  if (!uploadTargetUrl) {
    throw new Error(
      "Presigned upload URL is missing. Backend should return uploadUrl/presignedUrl."
    );
  }

  let uploadRes = await fetch(uploadTargetUrl, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": contentType,
    },
    body: file,
  });
  if (!uploadRes.ok) {
    // Some presigned URLs are signed without Content-Type header.
    uploadRes = await fetch(uploadTargetUrl, {
      method: "PUT",
      credentials: "include",
      body: file,
    });
  }
  if (!uploadRes.ok) {
    throw new Error(`Media upload failed: ${uploadRes.status}`);
  }

  const imageUrl = extractPublicMediaUrl(data, uploadTargetUrl);
  if (!imageUrl || typeof imageUrl !== "string") {
    throw new Error(
      "Upload response missing public media URL."
    );
  }

  return imageUrl;
}
