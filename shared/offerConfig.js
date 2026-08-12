export const DEFAULT_OFFER_CONFIG = Object.freeze({
  singleDiscountPercent: 15,
  combo2: Object.freeze({ enabled: true, price: 379, requiredItems: 2, freeDelivery: true }),
  combo3: Object.freeze({ enabled: true, price: 559, requiredItems: 3, freeDelivery: true }),
});

export const COMBO_TYPES = Object.freeze({ COMBO_2: 'combo2', COMBO_3: 'combo3' });

export function comboOffer(config, comboType) {
  const key = COMBO_TYPES[String(comboType || '').toUpperCase()];
  return key ? config[key] : null;
}

export const offerMoney = (value) => Number(Number(value || 0).toFixed(2));

export function singleOfferPrice(mrp, config = DEFAULT_OFFER_CONFIG) {
  return offerMoney(Number(mrp || 0) * (1 - Number(config.singleDiscountPercent || 0) / 100));
}
