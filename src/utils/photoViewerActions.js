export async function photoUrlToFile(url, fileName = "photo.jpg") {
  if (!url) throw new Error("Photo URL is required");
  const response = await fetch(url, {
    mode: "cors",
    credentials: "omit",
  });
  if (!response.ok) throw new Error("Photo download failed");
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || "image/jpeg" });
}

function normalizePhotoUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error("Photo URL is required");
  if (raw.startsWith("//")) return `https:${raw}`;
  if (/^(https?:|blob:|data:)/i.test(raw)) return raw;
  return new URL(raw, window.location.href).href;
}

function triggerDownload(href, fileName) {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function getCloudinaryAttachmentUrl(value, fileName) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (!/(^|\.)res\.cloudinary\.com$/i.test(parsed.hostname)) return null;

  const marker = "/upload/";
  if (!parsed.pathname.includes(marker)) return null;
  if (parsed.pathname.includes("/fl_attachment")) return parsed.href;

  const attachmentName = String(fileName || "lunmeyo-photo")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]+/gi, "-") || "lunmeyo-photo";
  parsed.pathname = parsed.pathname.replace(
    marker,
    `${marker}fl_attachment:${attachmentName}/`,
  );
  return parsed.href;
}

export async function downloadPhoto(url, fileName = "lunmeyo-photo.jpg") {
  const resolvedUrl = normalizePhotoUrl(url);
  const cloudinaryAttachmentUrl = getCloudinaryAttachmentUrl(resolvedUrl, fileName);

  // Keep this click synchronous. Safari and mobile Chromium can block a
  // download started only after an awaited network request loses user activation.
  if (cloudinaryAttachmentUrl) {
    triggerDownload(cloudinaryAttachmentUrl, fileName);
    return;
  }

  let objectUrl;

  try {
    const file = await photoUrlToFile(resolvedUrl, fileName);
    objectUrl = URL.createObjectURL(file);
    triggerDownload(objectUrl, fileName);
  } finally {
    if (objectUrl) {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    }
  }
}
