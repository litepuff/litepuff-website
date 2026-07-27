import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  createMetaEventId,
  isMetaPageViewExcluded,
} from './metaEvents.js';
import {
  initializeMetaPixel,
  isMetaPixelConfigured,
  trackMetaPageView,
} from './metaPixel.js';

let lastTrackedPageKey = '';

export default function MetaPixelProvider({ children }) {
  const location = useLocation();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    try {
      if (isMetaPixelConfigured()) void initializeMetaPixel();
    } catch {
      // Analytics is optional and must never affect application rendering.
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    try {
      if (!mountedRef.current || !isMetaPixelConfigured()) return;
      if (isMetaPageViewExcluded(location.pathname)) return;

      const pageKey = `${location.pathname}${location.search}`;
      if (lastTrackedPageKey === pageKey) return;

      lastTrackedPageKey = pageKey;
      trackMetaPageView(createMetaEventId('page-view'));
    } catch {
      // Route tracking is best-effort and must never affect navigation.
    }
  }, [location.pathname, location.search]);

  return children;
}
