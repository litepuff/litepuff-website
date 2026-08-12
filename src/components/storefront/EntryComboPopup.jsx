import { useEffect, useRef, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useOffers } from '../../hooks/useOffers.js';
import { formatMoney } from '../../utils/formatMoney.js';
import CampaignImage from './CampaignImage.jsx';
import { storefrontCampaign } from '../../config/storefrontCampaign.js';

const SUPPRESS_KEY = 'litepuff_combo_popup_suppressed_until';
const SESSION_KEY = 'litepuff_combo_popup_seen';

export default function EntryComboPopup() {
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);
  const previousFocus = useRef(null);
  const offers = useOffers();
  const navigate = useNavigate();

  useEffect(() => {
    const preview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('previewFestivalPopup') === 'true';
    const suppressed = Number(localStorage.getItem(SUPPRESS_KEY) || 0) > Date.now();
    if (!preview && (suppressed || sessionStorage.getItem(SESSION_KEY))) return undefined;
    const timer = window.setTimeout(() => { previousFocus.current = document.activeElement; setOpen(true); }, 3500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    dialog.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'Tab') {
        const focusable = dialog.current?.querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"])');
        if (!focusable?.length) return;
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; previousFocus.current?.focus?.(); };
  }, [open]);

  const later = () => { localStorage.setItem(SUPPRESS_KEY, String(Date.now() + 86400000)); sessionStorage.setItem(SESSION_KEY, '1'); setOpen(false); };
  const shop = () => {
    sessionStorage.setItem(SESSION_KEY, '1'); setOpen(false);
    navigate('/products');
  };
  if (!open) return null;
  return <div className="fixed inset-0 z-[110] grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && later()}>
    <section ref={dialog} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="combo-popup-title" className="relative grid max-h-[92svh] w-full overflow-y-auto rounded-t-[28px] bg-[#FAF8F2] shadow-2xl outline-none md:max-w-[820px] md:grid-cols-[46%_54%] md:overflow-hidden md:rounded-[28px]">
      <button type="button" onClick={later} aria-label="Close combo offer" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#243029] shadow-sm"><FiX /></button>
      <CampaignImage src={storefrontCampaign.popupImage || storefrontCampaign.image} mobileSrc={storefrontCampaign.popupMobileImage || storefrontCampaign.mobileImage} placeholder="Festival Popup Image" alt="LitePuff festive sale campaign" aspect="aspect-[16/8] md:aspect-auto md:h-full" className="order-first rounded-none border-0" imageClassName="object-center" />
      <div className="p-5 sm:p-6 md:p-8"><p className="text-xs font-black tracking-[.2em] text-[#A76525]">LITEPUFF FESTIVE SALE</p><h2 id="combo-popup-title" className="mt-2 font-display text-[32px] font-semibold leading-none text-[#243029] md:text-4xl">Celebrate More. Snack Better.</h2><p className="mt-3 text-sm leading-6 text-[#626A65]">Special festive savings on your favourite LitePuff snacks.</p><div className="mt-4 grid grid-cols-3 gap-2 text-center"><PopupOffer value={`${offers.singleDiscountPercent}% OFF`} label="Single Product" />{[[2, offers.combo2], [3, offers.combo3]].map(([count, offer]) => <PopupOffer key={count} value={`BUY ${count} · ${formatMoney(offer.price)}`} label="Free Delivery" />)}</div><p className="mt-4 text-sm font-bold text-[#1E4D3A]">Customise Your Offer</p><button type="button" onClick={shop} className="mt-4 h-11 w-full rounded-full bg-[#1E4D3A] text-sm font-bold text-white">Shop Now</button><button type="button" onClick={later} className="mt-1 h-9 w-full text-sm font-semibold text-[#626A65]">Maybe Later</button></div>
    </section>
  </div>;
}

function PopupOffer({ value, label }) {
  return <div className="rounded-xl border border-[#DED5C5] bg-white p-2"><strong className="block text-[11px] leading-4 text-[#1E4D3A] sm:text-xs">{value}</strong><small className="mt-1 block text-[9px] font-bold uppercase tracking-[.06em] text-[#817665]">{label}</small></div>;
}
