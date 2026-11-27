import { api } from "./api";
import { throwCloudinaryUploadError } from "../utils/mediaUploadApiError.js";
import {
  appendFormFields,
  extractPublicMediaUrl,
  extractSignedUrl,
  extractUploadFields,
  resolvePostMediaMime,
  fileWithResolvedMime,
} from "./postImageUploadApi";

const FEEDBACK_SCREENSHOT_PRESIGN_PATH =
  import.meta.env.VITE_FEEDBACK_SCREENSHOT_UPLOAD_PATH ||
  "/uploads/feedback-screenshot/presigned-url";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

async function uploadViaFeedbackScreenshotPresign(file) {
  const { data } = await api.get(FEEDBACK_SCREENSHOT_PRESIGN_PATH);

  const uploadUrl = extractSignedUrl(data);
  if (!uploadUrl) {
    throw new Error("Feedback screenshot presign missing upload URL");
  }

  const uploadFields = extractUploadFields(data);
  if (!uploadFields) {
    throw new Error("Feedback screenshot presign missing upload fields");
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
  } catch {
    /* ignore */
  }

  if (!uploadRes.ok) {
    throwCloudinaryUploadError(uploadRes, cloudBody);
  }

  const publicUrl = extractPublicMediaUrl(data, cloudBody);
  if (!publicUrl) {
    throw new Error("Feedback screenshot upload missing delivery URL");
  }

  return publicUrl;
}

/**
 * Upload a confidential feedback screenshot (`meyou/feedback`, Cloudinary authenticated).
 * @returns {Promise<string>} HTTPS Cloudinary URL stored on feedback row (not directly fetchable without signature)
 */
export async function uploadFeedbackScreenshot(file) {
  if (!file) throw new Error("No media file provided");

  const mime = resolvePostMediaMime(file);
  const uploadFile = fileWithResolvedMime(file, mime);

  if (!mime?.startsWith("image/")) {
    throw new Error("Only image files are supported");
  }
  if (uploadFile.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Image size must be 5MB or less");
  }

  return uploadViaFeedbackScreenshotPresign(uploadFile);
}