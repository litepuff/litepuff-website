import { META_EVENTS, compactMetaParams } from './metaEvents.js';

const META_PIXEL_SCRIPT_ID = 'meta-pixel-script';
const META_PIXEL_SCRIPT_URL = 'https://connect.facebook.net/en_US/fbevents.js';

let initializedPixelId = '';
let initializationPromise = null;

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

export function initializeMetaPixel() {
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
          fbq('init', pixelId);
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

export function trackMetaEvent(eventName, params = {}, eventId = '') {
  try {
    if (!getConfiguredPixelId() || typeof window === 'undefined') return false;

    const fbq = installMetaQueue();
    if (!fbq) return false;

    void initializeMetaPixel();

    const eventParams = compactMetaParams(params);
    const eventOptions = eventId ? { eventID: String(eventId) } : undefined;

    if (eventOptions) fbq('track', eventName, eventParams, eventOptions);
    else fbq('track', eventName, eventParams);

    return true;
  } catch {
    return false;
  }
}

export function trackMetaPageView(eventId = '') {
  try {
    return trackMetaEvent(META_EVENTS.PAGE_VIEW, {}, eventId);
  } catch {
    return false;
  }
}
