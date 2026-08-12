import { getRows, updateRow, appendRow } from './googleSheets.js';
import { COMBO_TYPES, DEFAULT_OFFER_CONFIG } from '../../shared/offerConfig.js';

const SETTING_KEY = 'store_offers';
const cleanBoolean = (value, fallback) => value === true || value === false ? value : fallback;
const positiveMoney = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(Number(value).toFixed(2)) : fallback;

export function normalizeOfferConfig(value = {}) {
  return {
    singleDiscountPercent: Math.min(100, Math.max(0, Number(value.singleDiscountPercent ?? DEFAULT_OFFER_CONFIG.singleDiscountPercent))),
    combo2: {
      enabled: cleanBoolean(value.combo2?.enabled, DEFAULT_OFFER_CONFIG.combo2.enabled),
      price: positiveMoney(value.combo2?.price, DEFAULT_OFFER_CONFIG.combo2.price),
      requiredItems: 2,
      freeDelivery: cleanBoolean(value.combo2?.freeDelivery, DEFAULT_OFFER_CONFIG.combo2.freeDelivery),
    },
    combo3: {
      enabled: cleanBoolean(value.combo3?.enabled, DEFAULT_OFFER_CONFIG.combo3.enabled),
      price: positiveMoney(value.combo3?.price, DEFAULT_OFFER_CONFIG.combo3.price),
      requiredItems: 3,
      freeDelivery: cleanBoolean(value.combo3?.freeDelivery, DEFAULT_OFFER_CONFIG.combo3.freeDelivery),
    },
  };
}

export async function getOfferConfig() {
  const row = (await getRows('SETTINGS')).find((item) => item.Key === SETTING_KEY);
  if (!row?.Value) return normalizeOfferConfig();
  try { return normalizeOfferConfig(JSON.parse(row.Value)); } catch { return normalizeOfferConfig(); }
}

export async function saveOfferConfig(input) {
  const config = normalizeOfferConfig(input);
  const rows = await getRows('SETTINGS');
  const existing = rows.find((item) => item.Key === SETTING_KEY);
  const record = {
    SettingID: existing?.SettingID || SETTING_KEY,
    Key: SETTING_KEY,
    Value: JSON.stringify(config),
    Type: 'json',
    UpdatedAt: new Date().toISOString(),
  };
  if (existing) await updateRow('SETTINGS', existing._row, record);
  else await appendRow('SETTINGS', record);
  return config;
}

export function comboDefinition(config, comboType) {
  const key = COMBO_TYPES[String(comboType || '').toUpperCase()];
  return key ? config[key] : null;
}
