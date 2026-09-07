/** Local copy of backend catalog — used when GET /gifts/catalog is unavailable. */
export const LOCAL_GIFT_CATALOG = [
  {
    id: 'smile',
    nameKey: 'gifts.catalog.smile',
    image: '/gifts/smile.webp',
    type: 'FREE',
    price: 0,
    currency: null,
  },
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
