export async function photoUrlToFile(url, fileName = "photo.jpg") {
  if (!url) throw new Error("Photo URL is required");
  const resolvedUrl = normalizePhotoUrl(url);
  const parsed = new URL(resolvedUrl);
  const isPublicMediaHost =
    /(^|\.)res\.cloudinary\.com$/i.test(parsed.hostname) ||
    /(^|\.)googleusercontent\.com$/i.test(parsed.hostname);
  const credentialModes = isPublicMediaHost
    ? ["omit", "include"]
    : ["include", "omit"];
  let response;
  let lastError;

  for (const credentials of credentialModes) {
    try {
      response = await fetch(resolvedUrl, {
        mode: "cors",
        credentials,
      });
      if (response.ok) break;
      lastError = new Error(`Photo download failed (${response.status})`);
    } catch (error) {
      lastError = error;
    }
  }

  if (!response?.ok) throw lastError || new Error("Photo download failed");
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
  link.style.position = "fixed";
  link.style.left = "-10000px";
  link.style.top = "0";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function triggerAttachmentDownload(href) {
  const frame = document.createElement("iframe");
  frame.src = href;
  frame.title = "";
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.left = "-10000px";
  frame.style.border = "0";
  document.body.appendChild(frame);
  window.setTimeout(() => frame.remove(), 60_000);
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
    triggerAttachmentDownload(cloudinaryAttachmentUrl);
    return;
  }

  if (typeof window.showSaveFilePicker === "function") {
    try {
      const fileHandle = await window.showSaveFilePicker({ suggestedName: fileName });
      const file = await photoUrlToFile(resolvedUrl, fileName);
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
      // Unsupported picker options or browser policy: continue with Blob download.
    }
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
