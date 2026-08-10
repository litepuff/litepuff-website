import { useCallback, useMemo } from 'react';
import {
  META_CONTENT_TYPE,
  META_CURRENCY,
  META_EVENTS,
  compactMetaParams,
  createMetaEventId,
  normalizeMetaContentIds,
  normalizeMetaValue,
} from './metaEvents.js';
import { trackMetaEvent } from './metaPixel.js';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';

function safeTrack(eventName, params, eventId, matching = {}) {
  try {
    const resolvedEventId = eventId || createMetaEventId(
      String(eventName || 'meta-event').toLowerCase(),
    );

    return {
      eventId: resolvedEventId,
      tracked: trackMetaEvent(
        eventName,
        compactMetaParams(params),
        resolvedEventId,
        matching,
      ),
    };
  } catch {
    return { eventId: '', tracked: false };
  }
}

export default function useMetaTracking() {
  const { customer } = useCustomerAuth();
  const trackViewContent = useCallback((product = {}, eventId = '') => {
    try {
      return safeTrack(
        META_EVENTS.VIEW_CONTENT,
        {
          content_ids: normalizeMetaContentIds(product.id ?? product.productId),
          content_name: product.name ?? product.productName,
          content_category: product.category,
          content_type: META_CONTENT_TYPE,
          currency: product.currency || META_CURRENCY,
          value: normalizeMetaValue(product.value ?? product.price),
        },
        eventId,
        customer,
      );
    } catch {
      return { eventId: '', tracked: false };
    }
  }, [customer]);

  const trackAddToCart = useCallback((product = {}, quantity = 1, eventId = '') => {
    try {
      const normalizedQuantity = Math.max(1, Number(quantity) || 1);
      const unitValue = normalizeMetaValue(product.value ?? product.price);

      return safeTrack(
        META_EVENTS.ADD_TO_CART,
        {
          content_ids: normalizeMetaContentIds(product.id ?? product.productId),
          content_name: product.name ?? product.productName,
          content_category: product.category,
          content_type: META_CONTENT_TYPE,
          contents: [{
            id: String(product.id ?? product.productId ?? ''),
            quantity: normalizedQuantity,
            item_price: unitValue,
          }],
          currency: product.currency || META_CURRENCY,
          value: unitValue === undefined
            ? undefined
            : normalizeMetaValue(unitValue * normalizedQuantity),
        },
        eventId,
        customer,
      );
    } catch {
      return { eventId: '', tracked: false };
    }
  }, [customer]);

  const trackInitiateCheckout = useCallback((checkout = {}, eventId = '') => {
    try {
      const items = Array.isArray(checkout.items) ? checkout.items : [];

      return safeTrack(
        META_EVENTS.INITIATE_CHECKOUT,
        {
          content_ids: normalizeMetaContentIds(
            items.map((item) => item.id ?? item.productId),
          ),
          content_type: META_CONTENT_TYPE,
          contents: items.map((item) => ({
            id: String(item.id ?? item.productId ?? ''),
            quantity: Math.max(1, Number(item.quantity) || 1),
            item_price: normalizeMetaValue(item.price),
          })),
          currency: checkout.currency || META_CURRENCY,
          num_items: items.reduce(
            (total, item) => total + Math.max(1, Number(item.quantity) || 1),
            0,
          ),
          value: normalizeMetaValue(checkout.value ?? checkout.grandTotal),
        },
        eventId,
        customer,
      );
    } catch {
      return { eventId: '', tracked: false };
    }
  }, [customer]);

  const trackPurchase = useCallback((order = {}, eventId = '') => {
    try {
      const items = Array.isArray(order.items) ? order.items : [];

      return safeTrack(
        META_EVENTS.PURCHASE,
        {
          order_id: order.orderId ?? order.transactionId,
          content_ids: normalizeMetaContentIds(
            items.map((item) => item.id ?? item.productId),
          ),
          content_name: items
            .map((item) => String(item.name ?? item.productName ?? '').trim())
            .filter(Boolean)
            .join(', '),
          content_type: META_CONTENT_TYPE,
          contents: items.map((item) => ({
            id: String(item.id ?? item.productId ?? ''),
            name: String(item.name ?? item.productName ?? ''),
            quantity: Math.max(1, Number(item.quantity) || 1),
            item_price: normalizeMetaValue(item.price),
          })),
          currency: order.currency || META_CURRENCY,
          num_items: items.reduce(
            (total, item) => total + Math.max(1, Number(item.quantity) || 1),
            0,
          ),
          value: normalizeMetaValue(
            order.value ?? order.amount ?? order.grandTotal,
          ),
        },
        eventId,
      );
    } catch {
      return { eventId: '', tracked: false };
    }
  }, []);

  const trackSearch = useCallback((searchTerm, eventId = '') => {
    try {
      const normalizedTerm = String(searchTerm || '').trim();
      if (!normalizedTerm) return { eventId: '', tracked: false };

      return safeTrack(
        META_EVENTS.SEARCH,
        { search_string: normalizedTerm },
        eventId,
      );
    } catch {
      return { eventId: '', tracked: false };
    }
  }, []);

  const trackViewCategory = useCallback((category, eventId = '') => {
    try {
      const normalizedCategory = String(category || '').trim();
      if (!normalizedCategory) return { eventId: '', tracked: false };

      return safeTrack(
        META_EVENTS.VIEW_CATEGORY,
        { content_category: normalizedCategory },
        eventId,
      );
    } catch {
      return { eventId: '', tracked: false };
    }
  }, []);

  const trackRemoveFromCart = useCallback((product = {}, quantity = 1, eventId = '') => {
    try {
      const normalizedQuantity = Math.max(1, Number(quantity) || 1);
      const unitValue = normalizeMetaValue(product.value ?? product.price);
      return safeTrack(
        META_EVENTS.REMOVE_FROM_CART,
        {
          content_ids: normalizeMetaContentIds(product.id ?? product.productId),
          content_name: product.name ?? product.productName,
          content_category: product.category,
          content_type: META_CONTENT_TYPE,
          contents: [{
            id: String(product.id ?? product.productId ?? ''),
            quantity: normalizedQuantity,
            item_price: unitValue,
          }],
          currency: product.currency || META_CURRENCY,
          value: unitValue === undefined
            ? undefined
            : normalizeMetaValue(unitValue * normalizedQuantity),
        },
        eventId,
      );
    } catch {
      return { eventId: '', tracked: false };
    }
  }, []);

  const trackAddPaymentInfo = useCallback((payment = {}, eventId = '') => {
    try {
      return safeTrack(
        META_EVENTS.ADD_PAYMENT_INFO,
        {
          content_ids: normalizeMetaContentIds(
            (Array.isArray(payment.items) ? payment.items : [])
              .map((item) => item.id ?? item.productId),
          ),
          content_type: META_CONTENT_TYPE,
          currency: payment.currency || META_CURRENCY,
          value: normalizeMetaValue(payment.value ?? payment.grandTotal),
          payment_type: payment.paymentMethod,
        },
        eventId,
      );
    } catch {
      return { eventId: '', tracked: false };
    }
  }, []);

  const trackAddToWishlist = useCallback((product = {}, eventId = '') => {
    try {
      return safeTrack(
        META_EVENTS.ADD_TO_WISHLIST,
        {
          content_ids: normalizeMetaContentIds(product.id ?? product.productId),
          content_name: product.name ?? product.productName,
          content_category: product.category,
          content_type: META_CONTENT_TYPE,
          currency: product.currency || META_CURRENCY,
          value: normalizeMetaValue(product.value ?? product.price),
        },
        eventId,
      );
    } catch {
      return { eventId: '', tracked: false };
    }
  }, []);

  const trackCompleteRegistration = useCallback((registration = {}, eventId = '') => {
    try {
      return safeTrack(
        META_EVENTS.COMPLETE_REGISTRATION,
        {
          content_name: registration.method,
          status: registration.status || 'completed',
        },
        eventId,
      );
    } catch {
      return { eventId: '', tracked: false };
    }
  }, []);

  const trackContact = useCallback((contact = {}, eventId = '') => {
    try {
      return safeTrack(
        META_EVENTS.CONTACT,
        { content_name: contact.subject },
        eventId,
      );
    } catch {
      return { eventId: '', tracked: false };
    }
  }, []);

  return useMemo(
    () => ({
      trackViewContent,
      trackAddToCart,
      trackInitiateCheckout,
      trackPurchase,
      trackSearch,
      trackViewCategory,
      trackRemoveFromCart,
      trackAddPaymentInfo,
      trackAddToWishlist,
      trackCompleteRegistration,
      trackContact,
    }),
    [
      trackAddToCart,
      trackInitiateCheckout,
      trackPurchase,
      trackSearch,
      trackViewCategory,
      trackViewContent,
      trackRemoveFromCart,
      trackAddPaymentInfo,
      trackAddToWishlist,
      trackCompleteRegistration,
      trackContact,
    ],
  );
}
