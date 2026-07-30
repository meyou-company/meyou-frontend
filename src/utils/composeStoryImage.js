function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Не удалось подготовить изображение с текстом"));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, mimeType) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Не удалось сохранить изображение с текстом"));
      },
      mimeType,
      mimeType === "image/jpeg" ? 0.92 : undefined,
    );
  });
}

function splitLongWord(context, word, maxWidth) {
  const parts = [];
  let currentPart = "";

  Array.from(word).forEach((character) => {
    const nextPart = `${currentPart}${character}`;

    if (currentPart && context.measureText(nextPart).width > maxWidth) {
      parts.push(currentPart);
      currentPart = character;
      return;
    }

    currentPart = nextPart;
  });

  if (currentPart) parts.push(currentPart);
  return parts;
}

function wrapText(context, text, maxWidth) {
  const lines = [];

  text.split(/\r?\n/).forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);

    if (!words.length) {
      lines.push("");
      return;
    }

    let currentLine = "";

    words.forEach((word) => {
      const wordParts =
        context.measureText(word).width > maxWidth
          ? splitLongWord(context, word, maxWidth)
          : [word];

      wordParts.forEach((part) => {
        const candidate = currentLine ? `${currentLine} ${part}` : part;

        if (currentLine && context.measureText(candidate).width > maxWidth) {
          lines.push(currentLine);
          currentLine = part;
          return;
        }

        currentLine = candidate;
      });
    });

    if (currentLine) lines.push(currentLine);
  });

  return lines;
}

export async function composeStoryImage({
  file,
  text,
  color,
  fontSize,
  position,
  frameWidth,
  frameHeight,
}) {
  const normalizedText = String(text || "").trim();
  if (!normalizedText) return file;

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Редактор изображения недоступен");
  }

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  context.drawImage(image, 0, 0);

  const safeFrameWidth = Math.max(1, Number(frameWidth) || image.naturalWidth);
  const safeFrameHeight = Math.max(1, Number(frameHeight) || image.naturalHeight);
  const coverScale = Math.max(
    safeFrameWidth / image.naturalWidth,
    safeFrameHeight / image.naturalHeight,
  );
  const renderedWidth = image.naturalWidth * coverScale;
  const renderedHeight = image.naturalHeight * coverScale;
  const offsetX = (safeFrameWidth - renderedWidth) / 2;
  const offsetY = (safeFrameHeight - renderedHeight) / 2;
  const sourceX =
    ((position.x / 100) * safeFrameWidth - offsetX) / coverScale;
  const sourceY =
    ((position.y / 100) * safeFrameHeight - offsetY) / coverScale;
  const sourceFontSize = Math.max(12, fontSize / coverScale);

  await document.fonts?.load?.(`700 ${Math.ceil(fontSize)}px Montserrat`);

  context.save();
  context.font = `700 ${sourceFontSize}px Montserrat, Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = color;
  context.shadowColor = color.toLowerCase() === "#111111"
    ? "rgba(255, 255, 255, 0.45)"
    : "rgba(0, 0, 0, 0.6)";
  context.shadowBlur = Math.max(2, sourceFontSize * 0.08);
  context.shadowOffsetY = Math.max(1, sourceFontSize * 0.04);
  const maxTextWidth = Math.min(
    image.naturalWidth * 0.94,
    (safeFrameWidth * 0.94) / coverScale,
  );
  const lines = wrapText(context, normalizedText, maxTextWidth);
  const lineHeight = sourceFontSize * 1.18;
  const firstLineY = sourceY - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    context.fillText(line, sourceX, firstLineY + index * lineHeight);
  });
  context.restore();

  const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await canvasToBlob(canvas, mimeType);
  const extension = mimeType === "image/png" ? "png" : "jpg";
  const baseName = file.name?.replace(/\.[^.]+$/, "") || "story";

  return new File([blob], `${baseName}-with-text.${extension}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}
