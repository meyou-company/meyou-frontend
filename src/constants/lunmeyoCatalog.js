import {
  LUNMEYO_ANIM_ITEMS,
  LUNMEYO_CHARACTERS,
  LUNMEYO_PNG_ITEMS,
  parseLunmeyoStickerId,
  readLunmeyoStickerId,
} from "./lunmeyoIds";

const pngModules = import.meta.glob("../assets/lunmeyo-stickers/lun-*.png", {
  eager: true,
  import: "default",
});

const mp4Modules = import.meta.glob("../assets/lunmeyo-gifs/*.mp4", {
  eager: true,
  import: "default",
});

function moduleUrl(modules, filename) {
  const hit = Object.entries(modules).find(([path]) => path.endsWith(`/${filename}`));
  return hit ? hit[1] : null;
}

function buildItems() {
  const pngs = LUNMEYO_PNG_ITEMS.map((item) => ({
    id: item.id,
    character: item.character,
    type: "png",
    src: item.publicSrc || moduleUrl(pngModules, item.file),
    nameKey: `lunmeyo.items.${item.id}`,
  })).filter((item) => item.src);

  const anims = LUNMEYO_ANIM_ITEMS.map((item) => ({
    id: item.id,
    character: item.character,
    type: "mp4",
    src: moduleUrl(mp4Modules, item.file),
    nameKey: `lunmeyo.items.${item.id}`,
  })).filter((item) => item.src);

  return [...pngs, ...anims];
}

export const LUNMEYO_ITEMS = buildItems();

const BY_ID = new Map(LUNMEYO_ITEMS.map((item) => [item.id, item]));

export function getLunmeyoItem(id) {
  const safe = parseLunmeyoStickerId(id);
  return safe ? BY_ID.get(safe) || null : null;
}

export function getLunmeyoItemFromMessage(message) {
  const id = readLunmeyoStickerId(message?.metadata, message?.text);
  return getLunmeyoItem(id);
}

export function listLunmeyoItems({ type, character } = {}) {
  return LUNMEYO_ITEMS.filter((item) => {
    if (type && item.type !== type) return false;
    if (character && item.character !== character) return false;
    return true;
  });
}

export { LUNMEYO_CHARACTERS, parseLunmeyoStickerId, readLunmeyoStickerId };
