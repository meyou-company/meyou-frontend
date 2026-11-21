/** SEC-009 P1.3.2 — protected chat attachment delivery (default off; never enable in prod until MAC + backend flag). */
export function isSec009ChatPrivateDeliveryEnabled() {
  const flag = import.meta.env.VITE_SEC009_CHAT_PRIVATE_DELIVERY_ENABLED;
  return flag === 'true' || flag === '1';
}