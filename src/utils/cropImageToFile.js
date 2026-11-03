import { AVATAR_OUTPUT_SIZE, drawAvatarCrop, normalizeAvatarCropMode } from "./avatarCrop";

export { AVATAR_OUTPUT_SIZE } from "./avatarCrop";

export async function cropImageToFile(imageSrc, cropPixels, fileName = "avatar.jpg", options = {}) {
  const image = await loadImage(imageSrc);
  const mode = options.mode ? normalizeAvatarCropMode(options.mode) : null;
  const outputSize = Number.isFinite(Number(options.outputSize))
    ? Number(options.outputSize)
    : mode
      ? AVATAR_OUTPUT_SIZE
      : null;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (outputSize) {
    canvas.width = outputSize;
    canvas.height = outputSize;
    drawAvatarCrop(ctx, image, cropPixels, outputSize, { mode: mode || "fill" });
  } else {
    canvas.width = cropPixels.width;
    canvas.height = cropPixels.height;
    ctx.drawImage(
      image,
      cropPixels.x,
      cropPixels.y,
      cropPixels.width,
      cropPixels.height,
      0,
      0,
      cropPixels.width,
      cropPixels.height,
    );
  }

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (next) => {
        if (!next) reject(new Error("Failed to encode cropped image"));
        else resolve(next);
      },
      "image/jpeg",
      0.92,
    );
  });

  return new File([blob], fileName, { type: "image/jpeg" });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
