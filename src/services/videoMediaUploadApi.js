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

function captureFrameFromFile(file, seekSeconds) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    video.onloadedmetadata = () => {
      const duration = Number(video.duration) || 0;
      const target =
        duration > 0
          ? Math.min(Math.max(seekSeconds, 0), Math.max(0, duration - 0.05))
          : 0;
      video.currentTime = target;
    };

    video.onseeked = () => {
      try {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        ctx.drawImage(video, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (!blob) {
              reject(new Error("Не удалось создать превью"));
              return;
            }
            resolve(
              new File([blob], `video-thumb-${Date.now()}.jpg`, {
                type: "image/jpeg",
              }),
            );
          },
          "image/jpeg",
          0.85,
        );
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Не удалось загрузить видео для превью"));
    };

    video.src = objectUrl;
  });
}

export async function generateVideoThumbnailFromFile(file, seekSeconds = 1) {
  validateVideoFile(file);

  try {
    return await captureFrameFromFile(file, seekSeconds);
  } catch (firstError) {
    if (seekSeconds === 0) throw firstError;
    return captureFrameFromFile(file, 0);
  }
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
