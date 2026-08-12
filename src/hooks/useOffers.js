import { useEffect, useState } from 'react';
import { getOfferConfig } from '../services/productService.js';
import { DEFAULT_OFFER_CONFIG } from '../../shared/offerConfig.js';

export function useOffers() {
  const [offers, setOffers] = useState(DEFAULT_OFFER_CONFIG);
  useEffect(() => { getOfferConfig().then(setOffers); }, []);
  return offers;
}
