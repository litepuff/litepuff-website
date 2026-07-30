import { META_EVENTS, compactMetaParams } from './metaEvents.js';
import { siteConfig } from '../utils/siteConfig.js';

const META_PIXEL_SCRIPT_ID = 'meta-pixel-script';
const META_PIXEL_SCRIPT_URL = 'https://connect.facebook.net/en_US/fbevents.js';
const META_CUSTOM_EVENTS = new Set([
  META_EVENTS.REMOVE_FROM_CART,
  META_EVENTS.VIEW_CATEGORY,
]);

let initializedPixelId = '';
let initializationPromise = null;
const META_CAPI_EVENTS = new Set([
  META_EVENTS.PAGE_VIEW,
  META_EVENTS.VIEW_CONTENT,
  META_EVENTS.ADD_TO_CART,
  META_EVENTS.INITIATE_CHECKOUT,
]);

const normalizeMatchingValue = (field, value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return '';
  if (field === 'ph') return normalized.replace(/\D/g, '');
  if (field === 'country') {
    if (normalized === 'india') return 'in';
    return normalized.replace(/[^a-z]/g, '').slice(0, 2);
  }
  if (field === 'ct' || field === 'st') return normalized.replace(/[^a-z0-9]/g, '');
  if (field === 'zp') return normalized.replace(/[\s-]/g, '');
  return normalized;
};

async function sha256(value) {
  try {
    if (!globalThis.crypto?.subtle || typeof TextEncoder === 'undefined') return '';
    const bytes = new TextEncoder().encode(value);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return '';
  }
}

export async function buildMetaAdvancedMatching(input = {}) {
  try {
    const values = {
      em: input.email,
      ph: input.phone,
      fn: input.firstName,
      ln: input.lastName,
      ct: input.city,
      st: input.state,
      country: input.country,
      zp: input.zip ?? input.pincode,
    };
    const entries = await Promise.all(Object.entries(values).map(async ([field, value]) => {
      const normalized = normalizeMatchingValue(field, value);
      return [field, normalized ? await sha256(normalized) : ''];
    }));
    return Object.fromEntries(entries.filter(([, value]) => value));
  } catch {
    return {};
  }
}

function cookieValue(name) {
  try {
    const prefix = `${name}=`;
    return document.cookie
      .split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith(prefix))
      ?.slice(prefix.length) || '';
  } catch {
    return '';
  }
}

async function forwardMetaConversion(eventName, params, eventId, matching = {}) {
  try {
    if (!META_CAPI_EVENTS.has(eventName) || !eventId || typeof window === 'undefined') return;
    const hashedUserData = await buildMetaAdvancedMatching(matching);
    await fetch(`${siteConfig.apiBaseUrl}/meta/events`, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        eventName,
        eventId,
        eventTime: Math.floor(Date.now() / 1000),
        eventSourceUrl: window.location.href,
        customData: compactMetaParams(params),
        hashedUserData,
        fbp: cookieValue('_fbp'),
        fbc: cookieValue('_fbc'),
      }),
    });
  } catch {
    // CAPI is optional and must never affect browser behavior.
  }
}

function getConfiguredPixelId() {
  try {
    return String(import.meta.env.VITE_META_PIXEL_ID || '').trim();
  } catch {
    return '';
  }
}

function installMetaQueue() {
  try {
    if (typeof window === 'undefined') return null;
    if (typeof window.fbq === 'function') return window.fbq;

    const fbq = function metaPixelQueue() {
      fbq.callMethod
        ? fbq.callMethod.apply(fbq, arguments)
        : fbq.queue.push(arguments);
    };

    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;

    return fbq;
  } catch {
    return null;
  }
}

function loadMetaPixelScript() {
  try {
    if (typeof document === 'undefined') return Promise.resolve(false);

    const existingScript = document.getElementById(META_PIXEL_SCRIPT_ID);
    if (existingScript) return Promise.resolve(true);

    return new Promise((resolve) => {
      try {
        const script = document.createElement('script');
        script.id = META_PIXEL_SCRIPT_ID;
        script.async = true;
        script.defer = true;
        script.src = META_PIXEL_SCRIPT_URL;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);

        const target = document.head || document.body;
        if (!target) {
          resolve(false);
          return;
        }

        target.appendChild(script);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return Promise.resolve(false);
  }
}

export function isMetaPixelConfigured() {
  try {
    return Boolean(getConfiguredPixelId());
  } catch {
    return false;
  }
}

export function initializeMetaPixel(advancedMatching = {}) {
  try {
    const pixelId = getConfiguredPixelId();
    if (!pixelId || typeof window === 'undefined') {
      return Promise.resolve(false);
    }

    if (initializedPixelId === pixelId && typeof window.fbq === 'function') {
      return initializationPromise || Promise.resolve(true);
    }

    if (initializationPromise) return initializationPromise;

    initializationPromise = Promise.resolve().then(async () => {
      try {
        const fbq = installMetaQueue();
        if (!fbq) return false;

        if (initializedPixelId !== pixelId) {
          const matching = compactMetaParams(advancedMatching);
          if (Object.keys(matching).length) fbq('init', pixelId, matching);
          else fbq('init', pixelId);
          initializedPixelId = pixelId;
        }

        await loadMetaPixelScript();
        return true;
      } catch {
        return false;
      }
    });

    return initializationPromise;
  } catch {
    return Promise.resolve(false);
  }
}

export function updateMetaAdvancedMatching(advancedMatching = {}) {
  try {
    const pixelId = getConfiguredPixelId();
    const matching = compactMetaParams(advancedMatching);
    if (
      !pixelId ||
      initializedPixelId !== pixelId ||
      typeof window?.fbq !== 'function' ||
      !Object.keys(matching).length
    ) {
      return false;
    }

    window.fbq('set', 'userData', pixelId, matching);
    return true;
  } catch {
    return false;
  }
}

export function trackMetaEvent(eventName, params = {}, eventId = '', matching = {}) {
  try {
    if (!getConfiguredPixelId() || typeof window === 'undefined') return false;

    const fbq = installMetaQueue();
    if (!fbq) return false;

    void initializeMetaPixel();

    const eventParams = compactMetaParams(params);
    const eventOptions = eventId ? { eventID: String(eventId) } : undefined;

    const command = META_CUSTOM_EVENTS.has(eventName) ? 'trackCustom' : 'track';
    if (eventOptions) fbq(command, eventName, eventParams, eventOptions);
    else fbq(command, eventName, eventParams);
    void forwardMetaConversion(eventName, eventParams, eventId, matching);

    return true;
  } catch {
    return false;
  }
}

export function trackMetaPageView(eventId = '', matching = {}) {
  try {
    return trackMetaEvent(META_EVENTS.PAGE_VIEW, {}, eventId, matching);
  } catch {
    return false;
  }
}
