/** Local copy of backend catalog — used when GET /gifts/catalog is unavailable. */
function freeGift(id, nameKey, image) {
  return {
    id,
    nameKey,
    image,
    type: 'FREE',
    price: 0,
    currency: null,
  };
}

export const LOCAL_GIFT_CATALOG = [
  freeGift('smile', 'gifts.catalog.smile', '/gifts/catalog/smile.png'),
  freeGift('love', 'gifts.catalog.love', '/gifts/catalog/love.png'),
  freeGift('kiss', 'gifts.catalog.kiss', '/gifts/catalog/kiss.png'),
  freeGift('coffee', 'gifts.catalog.coffee', '/gifts/catalog/coffee.png'),
  freeGift('good_day', 'gifts.catalog.goodDay', '/gifts/catalog/good_day.png'),
  freeGift('hugs', 'gifts.catalog.hugs', '/gifts/catalog/hugs.png'),
  {
    id: 'flowers',
    nameKey: 'gifts.catalog.flowers',
    image: '/gifts/flowers.png',
    type: 'FREE',
    price: 0,
    currency: null,
  },
  {
    id: 'coins_20',
    nameKey: 'gifts.catalog.coins20',
    image: '/gifts/money.png',
    type: 'PAID',
    price: 20,
    currency: 'USD',
  },
];
