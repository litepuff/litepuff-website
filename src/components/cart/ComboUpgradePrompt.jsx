import { useMemo, useState } from 'react';
import { FiArrowRight, FiGift, FiX } from 'react-icons/fi';
import { useOffers } from '../../hooks/useOffers.js';
import { formatMoney } from '../../utils/formatMoney.js';

export default function ComboUpgradePrompt({ items = [], onAccept }) {
  const offers = useOffers();
  const eligible = useMemo(() => items.filter((item) => item.type !== 'combo').reduce((sum, item) => sum + Number(item.quantity || 0), 0), [items]);
  const comboType = eligible === 2 ? 'COMBO_2' : eligible === 3 ? 'COMBO_3' : '';
  const signature = items.map((item) => `${item.id}:${item.quantity}`).sort().join('|');
  const [dismissed, setDismissed] = useState('');
  if (!comboType || dismissed === signature || items.some((item) => item.type === 'combo')) return null;
  const offer = comboType === 'COMBO_2' ? offers.combo2 : offers.combo3;
  if (!offer?.enabled) return null;
  const accept = () => {
    window.dispatchEvent(new CustomEvent('litepuff:open-combo', { detail: { comboType } }));
    onAccept?.();
  };
  return <aside className="relative rounded-[18px] border border-[#E1D2AF] bg-[#FFF8E8] p-4" aria-label={`BUY ${offer.requiredItems} combo offer`}>
    <button type="button" onClick={() => setDismissed(signature)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-[#756A5E] hover:bg-white" aria-label="Continue with regular purchase"><FiX /></button>
    <div className="flex gap-3 pr-7"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1E4D3A] text-white"><FiGift /></span><div><strong className="text-sm text-[#243029]">{eligible === 2 ? "You're close to a better deal" : 'Save more with BUY 3'}</strong><p className="mt-1 text-xs leading-5 text-[#645F57]">Turn these {eligible} products into a BUY {eligible} combo for {formatMoney(offer.price)} with FREE DELIVERY.</p></div></div>
    <button type="button" onClick={accept} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-[#1E4D3A] px-4 text-xs font-bold text-white">Use Combo Offer <FiArrowRight /></button>
    <button type="button" onClick={() => setDismissed(signature)} className="ml-3 min-h-10 text-xs font-semibold text-[#69645C]">Continue regular purchase</button>
  </aside>;
}
