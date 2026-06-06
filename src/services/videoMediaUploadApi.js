import { videosApi } from "./videosApi";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 80 * 1024 * 1024;

function pickString(...values) {
  return values.find((v) => typeof v === "string" && v.trim())?.trim() || null;
}

function extractUploadUrl(payload) {
  return pickString(
    payload?.uploadUrl,
    payload?.upload_url,
    payload?.signedUrl,
    payload?.presignedUrl,
    payload?.url,
    payload?.data?.uploadUrl,
    payload?.data?.upload_url,
    payload?.data?.signedUrl,
    payload?.data?.presignedUrl,
    payload?.data?.url,
  );
}

function extractUploadFields(payload) {
  const fields = payload?.uploadFields ?? payload?.upload_fields ?? payload?.fields;

  if (fields && typeof fields === "object") return fields;

  const { api_key, timestamp, signature, folder, public_id } = payload || {};

  if (api_key && timestamp && signature && folder && public_id) {
    return {
      api_key,
      timestamp,
      signature,
      folder,
      public_id,
    };
  }

  return null;
}

function extractFinalUrl(payload, uploadResponse) {
  return pickString(
    payload?.fileUrl,
    payload?.file_url,
    payload?.mediaUrl,
    payload?.secure_url,
    payload?.publicUrl,
    payload?.data?.fileUrl,
    payload?.data?.file_url,
    payload?.data?.mediaUrl,
    payload?.data?.secure_url,
    payload?.data?.publicUrl,
    uploadResponse?.secure_url,
    uploadResponse?.url,
  );
}

function appendFormFields(formData, fields) {
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
}

function validateVideoFile(file) {
  if (!file) {
    throw new Error("Файл не выбран");
  }

  if (!file.type?.startsWith("video/")) {
    throw new Error("Можно загрузить только видео");
  }

  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error("Видео должно быть меньше 80MB");
  }
}

function validateThumbnailFile(file) {
  if (!file) return;

  if (!file.type?.startsWith("image/")) {
    throw new Error("Превью должно быть изображением");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Превью должно быть меньше 10MB");
  }
}

async function uploadToCloudinary(file, presignType) {
  const presign = await videosApi.getPresignedUrl(file, presignType);
  const uploadUrl = extractUploadUrl(presign);
  const uploadFields = extractUploadFields(presign);

  if (!uploadUrl) {
    throw new Error("Backend не вернул uploadUrl для video media");
  }

  let uploadBody = null;

  if (uploadFields) {
    const formData = new FormData();
    appendFormFields(formData, uploadFields);
    formData.append("file", file);

    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    try {
      uploadBody = await response.json();
    } catch {
      uploadBody = null;
    }

    if (!response.ok) {
      throw new Error(
        uploadBody?.error?.message ||
          `Не удалось загрузить video media (${response.status})`,
      );
    }
  } else {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Не удалось загрузить video media (${response.status})`);
    }
  }

  const mediaUrl = extractFinalUrl(presign, uploadBody);

  if (!mediaUrl) {
    throw new Error("Upload прошёл, но mediaUrl не найден");
  }

  return mediaUrl;
}

export function getVideoDurationSeconds(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.max(0, Math.round(video.duration) || 0));
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };

    video.src = url;
  });
}

export async function uploadVideoMedia(file) {
  validateVideoFile(file);
  const mediaUrl = await uploadToCloudinary(file, file.type || "video");
  return { mediaUrl };
}

export async function uploadVideoThumbnail(file) {
  validateThumbnailFile(file);
  const mediaUrl = await uploadToCloudinary(file, file.type || "image");
  return { mediaUrl };
}
