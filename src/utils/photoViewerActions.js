export async function photoUrlToFile(url, fileName = "photo.jpg") {
  if (!url) throw new Error("Photo URL is required");
  const response = await fetch(url);
  if (!response.ok) throw new Error("Photo download failed");
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || "image/jpeg" });
}

export async function downloadPhoto(url, fileName = "lunmeyo-photo.jpg") {
  const file = await photoUrlToFile(url, fileName);
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
