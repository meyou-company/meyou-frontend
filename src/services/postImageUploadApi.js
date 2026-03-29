import { api } from "./api";

/**
 * Post image upload is optional. Only call the backend upload route when
 * VITE_ENABLE_POST_IMAGE_UPLOAD === "true" (backend must implement the route).
 * Otherwise the frontend never hits /uploads/post-image (avoids 404 noise).
 */
export function isPostImageUploadEnabled() {
  return import.meta.env.VITE_ENABLE_POST_IMAGE_UPLOAD === "true";
}

const UPLOAD_PATH =
  import.meta.env.VITE_POST_IMAGE_UPLOAD_PATH || "/uploads/post-image";

function extractImageUrl(payload) {
  if (!payload || typeof payload !== "object") return null;
  return (
    payload.imageUrl ??
    payload.url ??
    payload.data?.imageUrl ??
    payload.data?.url ??
    null
  );
}

/**
 * Upload image via backend (multipart). Call only when isPostImageUploadEnabled().
 * @returns {Promise<string>} public image URL
 */
export async function uploadPostImage(file) {
  if (!file) throw new Error("No image file provided");
  if (!file.type?.startsWith("image/")) {
    throw new Error("Only image files are supported for posts");
  }

  const fd = new FormData();
  fd.append("file", file);

  const { data } = await api.post(UPLOAD_PATH, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const imageUrl = extractImageUrl(data);
  if (!imageUrl || typeof imageUrl !== "string") {
    throw new Error(
      "Upload response missing imageUrl. Backend should return { imageUrl: string }."
    );
  }

  return imageUrl;
}
