export const AVATAR_OUTPUT_SIZE = 512;
export const AVATAR_PREVIEW_SIZE = 96;

export const AVATAR_CROP_MODE = {
  FILL: "fill",
  FIT: "fit",
};

export const AVATAR_CROP_ZOOM = {
  fill: {
    min: 1,
    max: 4,
    step: 0.01,
    defaultZoom: 1,
    objectFit: "cover",
    restrictPosition: true,
  },
  fit: {
    min: 0.5,
    max: 3,
    step: 0.01,
    defaultZoom: 1,
    objectFit: "contain",
    restrictPosition: false,
  },
};

export function normalizeAvatarCropMode(mode) {
  return mode === AVATAR_CROP_MODE.FIT ? AVATAR_CROP_MODE.FIT : AVATAR_CROP_MODE.FILL;
}

export function getAvatarCropZoomConfig(mode) {
  return AVATAR_CROP_ZOOM[normalizeAvatarCropMode(mode)];
}

function toRect(cropPixels) {
  return {
    x: Number(cropPixels?.x) || 0,
    y: Number(cropPixels?.y) || 0,
    width: Number(cropPixels?.width) || 0,
    height: Number(cropPixels?.height) || 0,
  };
}

function imageSize(imageWidth, imageHeight) {
  return {
    width: Number(imageWidth) || 0,
    height: Number(imageHeight) || 0,
  };
}

export function getCoverDrawRect(imageWidth, imageHeight, outputSize) {
  const { width, height } = imageSize(imageWidth, imageHeight);
  const out = Number(outputSize) || 0;
  if (!width || !height || !out) {
    return { sx: 0, sy: 0, sw: 0, sh: 0, dx: 0, dy: 0, dw: out, dh: out };
  }

  const scale = Math.max(out / width, out / height);
  const dw = width * scale;
  const dh = height * scale;
  return {
    sx: 0,
    sy: 0,
    sw: width,
    sh: height,
    dx: (out - dw) / 2,
    dy: (out - dh) / 2,
    dw,
    dh,
  };
}

export function getFillDrawRect(imageWidth, imageHeight, cropPixels, outputSize) {
  const { width, height } = imageSize(imageWidth, imageHeight);
  const crop = toRect(cropPixels);
  const out = Number(outputSize) || Math.round(crop.width);

  let sx = crop.x;
  let sy = crop.y;
  let sw = crop.width;
  let sh = crop.height;

  if (sx < 0) {
    sw += sx;
    sx = 0;
  }
  if (sy < 0) {
    sh += sy;
    sy = 0;
  }
  if (sx + sw > width) sw = width - sx;
  if (sy + sh > height) sh = height - sy;

  if (sw <= 0 || sh <= 0 || out <= 0) {
    return { sx: 0, sy: 0, sw: 0, sh: 0, dx: 0, dy: 0, dw: out, dh: out, hasLetterbox: false };
  }

  return { sx, sy, sw, sh, dx: 0, dy: 0, dw: out, dh: out, hasLetterbox: false };
}

export function getFitDrawRect(imageWidth, imageHeight, cropPixels, outputSize) {
  const { width, height } = imageSize(imageWidth, imageHeight);
  const crop = toRect(cropPixels);
  const out = Number(outputSize) || Math.round(crop.width);

  if (!width || !height || crop.width <= 0 || crop.height <= 0 || out <= 0) {
    return { sx: 0, sy: 0, sw: 0, sh: 0, dx: 0, dy: 0, dw: 0, dh: 0, hasLetterbox: true };
  }

  const sx = Math.max(0, crop.x);
  const sy = Math.max(0, crop.y);
  const ex = Math.min(width, crop.x + crop.width);
  const ey = Math.min(height, crop.y + crop.height);
  const sw = ex - sx;
  const sh = ey - sy;

  if (sw <= 0 || sh <= 0) {
    return { sx: 0, sy: 0, sw: 0, sh: 0, dx: 0, dy: 0, dw: 0, dh: 0, hasLetterbox: true };
  }

  const dx = ((sx - crop.x) / crop.width) * out;
  const dy = ((sy - crop.y) / crop.height) * out;
  const dw = (sw / crop.width) * out;
  const dh = (sh / crop.height) * out;
  const hasLetterbox =
    sx > crop.x + 0.5 ||
    sy > crop.y + 0.5 ||
    ex < crop.x + crop.width - 0.5 ||
    ey < crop.y + crop.height - 0.5;

  return { sx, sy, sw, sh, dx, dy, dw, dh, hasLetterbox };
}

export function getAvatarCropDrawRect(imageWidth, imageHeight, cropPixels, outputSize, mode) {
  return normalizeAvatarCropMode(mode) === AVATAR_CROP_MODE.FIT
    ? getFitDrawRect(imageWidth, imageHeight, cropPixels, outputSize)
    : getFillDrawRect(imageWidth, imageHeight, cropPixels, outputSize);
}

function createWorkCanvas(size) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(size, size);
  }
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

export function drawBlurredCover(ctx, image, outputSize, blurPx = 28) {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  if (!iw || !ih || !outputSize) return;

  const cover = getCoverDrawRect(iw, ih, outputSize);
  const off = createWorkCanvas(outputSize);
  const offCtx = off.getContext("2d");
  offCtx.drawImage(image, cover.sx, cover.sy, cover.sw, cover.sh, cover.dx, cover.dy, cover.dw, cover.dh);

  const pad = Math.ceil(outputSize * 0.12);
  ctx.save();
  ctx.filter = `blur(${blurPx}px)`;
  ctx.drawImage(off, -pad, -pad, outputSize + pad * 2, outputSize + pad * 2);
  ctx.filter = "none";
  ctx.restore();
}

export function drawAvatarCrop(ctx, image, cropPixels, outputSize, options = {}) {
  const mode = normalizeAvatarCropMode(options.mode);
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const mapping = getAvatarCropDrawRect(iw, ih, cropPixels, outputSize, mode);

  ctx.save();
  ctx.clearRect(0, 0, outputSize, outputSize);

  if (mode === AVATAR_CROP_MODE.FIT && mapping.hasLetterbox) {
    drawBlurredCover(ctx, image, outputSize, options.blurPx ?? 28);
  } else {
    ctx.fillStyle = "#1a1228";
    ctx.fillRect(0, 0, outputSize, outputSize);
  }

  if (mapping.sw > 0 && mapping.sh > 0 && mapping.dw > 0 && mapping.dh > 0) {
    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      image,
      mapping.sx,
      mapping.sy,
      mapping.sw,
      mapping.sh,
      mapping.dx,
      mapping.dy,
      mapping.dw,
      mapping.dh,
    );
  }

  ctx.restore();
  return mapping;
}
