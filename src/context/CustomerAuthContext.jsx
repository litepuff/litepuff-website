import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { customerService } from '../services/customerService';

const CustomerAuthContext = createContext(null);
let restoreRequest;

const restoreCustomer = () => {
  restoreRequest ||= customerService.me().finally(() => { restoreRequest = null; });
  return restoreRequest;
};

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    restoreCustomer().then(async ({ customer: restored }) => {
      if (!active) return;
      setCustomer(restored);
      await mergeGuestCart(restored.id);
    }).catch(() => { if (active) setCustomer(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function completeAuthentication(result) {
    setCustomer(result.customer);
    await mergeGuestCart(result.customer.id);
    return result.customer;
  }
  async function logout() { try { await customerService.logout(); } finally { setCustomer(null); } }
  async function logoutAll() { try { await customerService.logoutAll(); } finally { setCustomer(null); } }
  function updateCustomer(next) { setCustomer(next); }
  const value = useMemo(() => ({ customer, loading, completeAuthentication, logout, logoutAll, updateCustomer }), [customer, loading]);
  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

async function mergeGuestCart(customerId) {
  const items = JSON.parse(localStorage.getItem('everydayMakhanaCart') || '[]');
  if (!items.length || localStorage.getItem('litepuffCartMergedFor') === customerId) return;
  await Promise.allSettled(items.map((item) => customerService.addCart(item.id, Number(item.quantity || 1))));
  localStorage.setItem('litepuffCartMergedFor', customerId);
}

export const useCustomerAuth = () => useContext(CustomerAuthContext);
