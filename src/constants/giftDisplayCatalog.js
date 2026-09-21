/** Visual catalog for /my-gifts. Only items with backendId can be sent. */

export const GIFT_SECTION_ID = {
  FREE: "free",
  COINS: "coins",
  PREMIUM: "premium",
};

export const GIFT_DISPLAY_SECTIONS = [
  {
    id: GIFT_SECTION_ID.FREE,
    titleKey: "gifts.sections.free",
    hintKey: "gifts.sections.freeHint",
    items: [
      { key: "smile", backendId: "smile", nameKey: "gifts.catalog.smile", image: "/gifts/catalog/smile.png" },
      { key: "love", backendId: null, nameKey: "gifts.catalog.love", image: "/gifts/catalog/love.png" },
      { key: "kiss", backendId: null, nameKey: "gifts.catalog.kiss", image: "/gifts/catalog/kiss.png" },
      { key: "coffee", backendId: null, nameKey: "gifts.catalog.coffee", image: "/gifts/catalog/coffee.png" },
      { key: "good_day", backendId: null, nameKey: "gifts.catalog.goodDay", image: "/gifts/catalog/good_day.png" },
      { key: "hugs", backendId: null, nameKey: "gifts.catalog.hugs", image: "/gifts/catalog/hugs.png" },
    ],
  },
  {
    id: GIFT_SECTION_ID.COINS,
    titleKey: "gifts.sections.coins",
    hintKey: "gifts.sections.coinsHint",
    items: [
      { key: "flowers", backendId: "flowers", nameKey: "gifts.catalog.flowers", image: "/gifts/catalog/flowers.png" },
      { key: "teddy", backendId: null, nameKey: "gifts.catalog.teddy", image: "/gifts/catalog/teddy.png" },
      { key: "cake", backendId: null, nameKey: "gifts.catalog.cake", image: "/gifts/catalog/cake.png" },
      { key: "chocolate", backendId: null, nameKey: "gifts.catalog.chocolate", image: "/gifts/catalog/chocolate.png" },
      { key: "puppy", backendId: null, nameKey: "gifts.catalog.puppy", image: "/gifts/catalog/puppy.png" },
      { key: "rose", backendId: null, nameKey: "gifts.catalog.rose", image: "/gifts/catalog/rose.png" },
    ],
  },
  {
    id: GIFT_SECTION_ID.PREMIUM,
    titleKey: "gifts.sections.premium",
    hintKey: "gifts.sections.premiumHint",
    items: [
      { key: "diamond", backendId: null, nameKey: "gifts.catalog.diamond", image: "/gifts/catalog/diamond.png" },
      { key: "crown", backendId: null, nameKey: "gifts.catalog.crown", image: "/gifts/catalog/crown.png" },
      { key: "cheers", backendId: null, nameKey: "gifts.catalog.cheers", image: "/gifts/catalog/cheers.png" },
      { key: "travel", backendId: null, nameKey: "gifts.catalog.travel", image: "/gifts/catalog/travel.png" },
      { key: "yacht", backendId: null, nameKey: "gifts.catalog.yacht", image: "/gifts/catalog/yacht.png" },
      { key: "evening", backendId: null, nameKey: "gifts.catalog.evening", image: "/gifts/catalog/evening.png" },
    ],
  },
];

function toCatalogGift(item, backend, sectionId) {
  const type = backend?.type || (sectionId === GIFT_SECTION_ID.FREE ? "FREE" : "PAID");
  const sendable = Boolean(backend && String(backend.type).toUpperCase() === "FREE");
  return {
    key: item.key,
    sectionId,
    backendId: item.backendId || backend?.id || null,
    id: backend?.id || item.key,
    sendId: backend?.id || null,
    sendable,
    comingSoon: !backend,
    type,
    price: backend?.price ?? null,
    currency: backend?.currency ?? null,
    image: item.image || backend?.image || "",
    nameKey: item.nameKey || backend?.nameKey,
  };
}

export function mergeCatalogSections(apiItems) {
  const list = Array.isArray(apiItems) ? apiItems : [];
  const apiById = new Map(list.map((gift) => [gift.id, gift]));
  const used = new Set();

  const sections = GIFT_DISPLAY_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const backend = item.backendId ? apiById.get(item.backendId) : null;
      if (backend) used.add(backend.id);
      return toCatalogGift(item, backend, section.id);
    }),
  }));

  list.forEach((backend) => {
    if (used.has(backend.id)) return;
    const sectionId =
      String(backend.type).toUpperCase() === "PAID"
        ? GIFT_SECTION_ID.COINS
        : GIFT_SECTION_ID.FREE;
    const section = sections.find((entry) => entry.id === sectionId);
    if (!section) return;
    section.items.push(
      toCatalogGift(
        {
          key: backend.id,
          backendId: backend.id,
          nameKey: backend.nameKey,
          image: backend.image,
        },
        backend,
        sectionId,
      ),
    );
  });

  return sections;
}
