export const LUNMEYO_CHARACTERS = {
  LUN: "lun",
  ROUND: "round",
};

/** Static PNG filenames without extension. All belong to Lun except round-hello. */
export const LUNMEYO_PNG_ITEMS = [
  { id: "lun-blush", character: LUNMEYO_CHARACTERS.LUN, file: "lun-blush.png" },
  { id: "lun-book", character: LUNMEYO_CHARACTERS.LUN, file: "lun-book.png" },
  { id: "lun-coffee", character: LUNMEYO_CHARACTERS.LUN, file: "lun-coffee.png" },
  { id: "lun-cool", character: LUNMEYO_CHARACTERS.LUN, file: "lun-cool.png" },
  { id: "lun-gift", character: LUNMEYO_CHARACTERS.LUN, file: "lun-gift.png" },
  { id: "lun-happy", character: LUNMEYO_CHARACTERS.LUN, file: "lun-happy.png" },
  { id: "lun-headphones", character: LUNMEYO_CHARACTERS.LUN, file: "lun-headphones.png" },
  { id: "lun-heart", character: LUNMEYO_CHARACTERS.LUN, file: "lun-heart.png" },
  { id: "lun-heart-eyes", character: LUNMEYO_CHARACTERS.LUN, file: "lun-heart-eyes.png" },
  { id: "lun-idea", character: LUNMEYO_CHARACTERS.LUN, file: "lun-idea.png" },
  { id: "lun-joy", character: LUNMEYO_CHARACTERS.LUN, file: "lun-joy.png" },
  { id: "lun-kiss", character: LUNMEYO_CHARACTERS.LUN, file: "lun-kiss.png" },
  { id: "lun-laptop", character: LUNMEYO_CHARACTERS.LUN, file: "lun-laptop.png" },
  { id: "lun-laugh", character: LUNMEYO_CHARACTERS.LUN, file: "lun-laugh.png" },
  { id: "lun-love", character: LUNMEYO_CHARACTERS.LUN, file: "lun-love.png" },
  { id: "lun-meditate", character: LUNMEYO_CHARACTERS.LUN, file: "lun-meditate.png" },
  { id: "lun-night", character: LUNMEYO_CHARACTERS.LUN, file: "lun-night.png" },
  { id: "lun-ok", character: LUNMEYO_CHARACTERS.LUN, file: "lun-ok.png" },
  { id: "lun-party", character: LUNMEYO_CHARACTERS.LUN, file: "lun-party.png" },
  { id: "lun-peace", character: LUNMEYO_CHARACTERS.LUN, file: "lun-peace.png" },
  { id: "lun-shield", character: LUNMEYO_CHARACTERS.LUN, file: "lun-shield.png" },
  { id: "lun-sleep", character: LUNMEYO_CHARACTERS.LUN, file: "lun-sleep.png" },
  { id: "lun-smirk", character: LUNMEYO_CHARACTERS.LUN, file: "lun-smirk.png" },
  { id: "lun-spin", character: LUNMEYO_CHARACTERS.LUN, file: "lun-spin.png" },
  { id: "lun-star", character: LUNMEYO_CHARACTERS.LUN, file: "lun-star.png" },
  { id: "lun-thumbs-up", character: LUNMEYO_CHARACTERS.LUN, file: "lun-thumbs-up.png" },
  { id: "lun-wave", character: LUNMEYO_CHARACTERS.LUN, file: "lun-wave.png" },
  { id: "lun-wink", character: LUNMEYO_CHARACTERS.LUN, file: "lun-wink.png" },
  { id: "lun-working", character: LUNMEYO_CHARACTERS.LUN, file: "lun-working.png" },
  {
    id: "round-hello",
    character: LUNMEYO_CHARACTERS.ROUND,
    file: null,
    publicSrc: "/luna/moon/hello.png",
  },
];

/** MP4 animations. IDs stay unique from PNG stickers. */
export const LUNMEYO_ANIM_ITEMS = [
  { id: "lun-clumsy", character: LUNMEYO_CHARACTERS.LUN, file: "lun-clumsy.mp4" },
  { id: "lun-coffee-anim", character: LUNMEYO_CHARACTERS.LUN, file: "lun-coffee.mp4" },
  { id: "lun-love-anim", character: LUNMEYO_CHARACTERS.LUN, file: "lun-love.mp4" },
  { id: "lun-meditation", character: LUNMEYO_CHARACTERS.LUN, file: "lun-meditation.mp4" },
  { id: "lun-oops", character: LUNMEYO_CHARACTERS.ROUND, file: "lun-oops.mp4" },
  { id: "lun-sleep-anim", character: LUNMEYO_CHARACTERS.LUN, file: "lun-sleep.mp4" },
  { id: "lun-typing", character: LUNMEYO_CHARACTERS.LUN, file: "lun-typing.mp4" },
];

export const LUNMEYO_ALLOWED_IDS = new Set([
  ...LUNMEYO_PNG_ITEMS.map((item) => item.id),
  ...LUNMEYO_ANIM_ITEMS.map((item) => item.id),
]);

export function parseLunmeyoStickerId(raw) {
  if (typeof raw !== "string") return null;
  const id = raw.trim().toLowerCase();
  return LUNMEYO_ALLOWED_IDS.has(id) ? id : null;
}

export function readLunmeyoStickerId(metadata, text) {
  const fromMeta = parseLunmeyoStickerId(metadata?.lunmeyoStickerId);
  if (fromMeta) return fromMeta;
  const match = String(text || "").match(/^::lunmeyo:([a-z0-9-]+)::$/);
  return match ? parseLunmeyoStickerId(match[1]) : null;
}
