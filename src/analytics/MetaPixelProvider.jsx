import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import {
  createMetaEventId,
  isMetaPageViewExcluded,
} from './metaEvents.js';
import {
  initializeMetaPixel,
  isMetaPixelConfigured,
  trackMetaPageView,
  buildMetaAdvancedMatching,
  updateMetaAdvancedMatching,
} from './metaPixel.js';

let lastTrackedPageKey = '';
const AUTH_RESTORE_TIMEOUT_MS = 2000;

export default function MetaPixelProvider({ children }) {
  const location = useLocation();
  const { customer, loading } = useCustomerAuth();
  const mountedRef = useRef(true);
  const initializationStartedRef = useRef(false);
  const [pixelReady, setPixelReady] = useState(false);

  useEffect(() => {
    mountedRef.current = true;

    try {
      if (!isMetaPixelConfigured()) return undefined;

      const initialize = async (matchingCustomer = null) => {
        if (initializationStartedRef.current) return;
        initializationStartedRef.current = true;
        const matching = await buildMetaAdvancedMatching(matchingCustomer || {});
        await initializeMetaPixel(matching);
        if (mountedRef.current) setPixelReady(true);
      };

      if (!loading) {
        void initialize(customer);
        return undefined;
      }

      const timeoutId = window.setTimeout(
        () => void initialize(),
        AUTH_RESTORE_TIMEOUT_MS,
      );
      return () => window.clearTimeout(timeoutId);
    } catch {
      // Analytics is optional and must never affect application rendering.
    }

    return undefined;
  }, [customer, loading]);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  useEffect(() => {
    try {
      if (!pixelReady || !customer) return;
      void buildMetaAdvancedMatching(customer).then(updateMetaAdvancedMatching);
    } catch {
      // Advanced Matching updates are optional and never affect authentication.
    }
  }, [customer, pixelReady]);

  useEffect(() => {
    try {
      if (!mountedRef.current || !pixelReady || !isMetaPixelConfigured()) return;
      if (isMetaPageViewExcluded(location.pathname)) return;

      const pageKey = `${location.pathname}${location.search}`;
      if (lastTrackedPageKey === pageKey) return;

      lastTrackedPageKey = pageKey;
      trackMetaPageView(createMetaEventId('page-view'), customer || {});
    } catch {
      // Route tracking is best-effort and must never affect navigation.
    }
  }, [customer, location.pathname, location.search, pixelReady]);

  return children;
}
