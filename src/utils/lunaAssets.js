export const LUNA_APPEARANCE = {
  MOON: "MOON",
  ROBOT: "ROBOT",
};

export const LUNA_STICKER_IDS = [
  "hello",
  "joy",
  "laugh",
  "hug",
  "thinking",
  "support",
  "surprise",
  "thanks",
  "goodnight",
  "morning",
  "celebrate",
  "wink",
];

const STICKER_SET = new Set(LUNA_STICKER_IDS);

/**
 * Only ship a sticker when the file matches that character.
 * Moon and robot currently have real art for hello/joy; other
 * reactions stay hidden until matching poses exist.
 */
const AVAILABLE_STICKERS = {
  MOON: new Set(["hello", "joy"]),
  ROBOT: new Set(["hello", "joy"]),
};

const STICKER_FILES = {
  MOON: {
    hello: "/luna/moon/hello.png",
    joy: "/luna/moon/hello.png",
  },
  ROBOT: {
    hello: "/luna/robot/hello.png",
    joy: "/luna/robot/hello.png",
  },
};

/** Set a public path here only when the GIF actually exists in the repo. */
const ANIMATED_FILES = {
  greeting: { MOON: null, ROBOT: null },
  think: { MOON: null, ROBOT: null },
};

export const LUNA_MISSING_FILES = [
  "public/luna/moon/hello-run.gif — short greeting run-in",
  "public/luna/moon/think-loop.gif — thinking loop",
  "public/luna/robot/hello-run.gif — short greeting run-in",
  "public/luna/robot/think-loop.gif — thinking loop",
  "public/luna/moon/{joy,laugh,hug,thinking,support,surprise,thanks,goodnight,morning,celebrate,wink}.png — extra moon poses (hello uses the provided character art)",
  "public/luna/robot/{joy,laugh,hug,thinking,support,surprise,thanks,goodnight,morning,celebrate,wink}.png — extra robot poses (hello uses the provided character art)",
  ...LUNA_STICKER_IDS.flatMap((id) => [`public/luna/robot/${id}.gif`]),
];

export function normalizeLunaAppearance(value) {
  return value === LUNA_APPEARANCE.ROBOT
    ? LUNA_APPEARANCE.ROBOT
    : value === LUNA_APPEARANCE.MOON
      ? LUNA_APPEARANCE.MOON
      : null;
}

export function lunaFolder(appearance) {
  return normalizeLunaAppearance(appearance) === LUNA_APPEARANCE.ROBOT
    ? "robot"
    : "moon";
}

export function lunaAvatarSrc(appearance) {
  const look = normalizeLunaAppearance(appearance);
  if (look === LUNA_APPEARANCE.ROBOT) return "/luna/robot/avatar.png";
  if (look === LUNA_APPEARANCE.MOON) return "/luna/moon/avatar.png";
  return `/luna/${lunaFolder(appearance)}/avatar.png`;
}

export function lunaStickerSrc(appearance, stickerId) {
  const look = normalizeLunaAppearance(appearance);
  const id = typeof stickerId === "string" ? stickerId.trim().toLowerCase() : "";
  if (!look || !STICKER_SET.has(id)) return null;
  if (!AVAILABLE_STICKERS[look]?.has(id)) return null;
  return STICKER_FILES[look]?.[id] || null;
}

export function lunaGreetingSrc(appearance) {
  const look = normalizeLunaAppearance(appearance);
  return look ? ANIMATED_FILES.greeting[look] || null : null;
}

export function lunaThinkSrc(appearance) {
  const look = normalizeLunaAppearance(appearance);
  return look ? ANIMATED_FILES.think[look] || null : null;
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}
