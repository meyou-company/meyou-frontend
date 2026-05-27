import { storiesApi } from "./storiesApi";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 80 * 1024 * 1024;

function getMediaType(file) {
  if (file?.type?.startsWith("video/")) return "video";
  return "image";
}

function validateStoryFile(file) {
  if (!file) {
    throw new Error("Файл не вибрано");
  }

  const isImage = file.type?.startsWith("image/");
  const isVideo = file.type?.startsWith("video/");

  if (!isImage && !isVideo) {
    throw new Error("Можна завантажити тільки фото або відео");
  }

  if (isImage && file.size > MAX_IMAGE_SIZE) {
    throw new Error("Фото має бути менше 10MB");
  }

  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    throw new Error("Відео має бути менше 80MB");
  }
}

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
    payload?.data?.url
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
    uploadResponse?.url
  );
}

function appendFormFields(formData, fields) {
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
}

export async function uploadStoryMedia(file) {
  validateStoryFile(file);

  const presign = await storiesApi.getPresignedUrl(file);
  const uploadUrl = extractUploadUrl(presign);
  const uploadFields = extractUploadFields(presign);

  if (!uploadUrl) {
    throw new Error("Backend не повернув uploadUrl для story media");
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
          `Не вдалося завантажити story media (${response.status})`
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
      throw new Error(`Не вдалося завантажити story media (${response.status})`);
    }
  }

  const mediaUrl = extractFinalUrl(presign, uploadBody);

  if (!mediaUrl) {
    throw new Error("Upload пройшов, але mediaUrl не знайдено");
  }

  return {
    mediaUrl,
    mediaType: getMediaType(file),
  };
}