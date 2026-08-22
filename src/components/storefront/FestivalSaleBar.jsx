import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';
import { useOffers } from '../../hooks/useOffers.js';
import { formatMoney } from '../../utils/formatMoney.js';

export default function FestivalSaleBar() {
  const offers = useOffers();
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const messages = useMemo(() => [
    { title: 'Festive Sale', detail: 'Build Your Own Combo' },
    offers.combo2.enabled && { title: `Buy 2 ${formatMoney(offers.combo2.price)}`, detail: offers.combo2.freeDelivery ? 'Free Delivery' : '' },
    offers.combo3.enabled && { title: `Buy 3 ${formatMoney(offers.combo3.price)}`, detail: offers.combo3.freeDelivery ? 'Free Delivery' : '' },
    { title: `${offers.singleDiscountPercent}% Off`, detail: 'Single Products' },
  ].filter(Boolean), [offers]);

  useEffect(() => {
    if (paused || reduceMotion || messages.length < 2) return undefined;
    const interval = window.setInterval(() => setActive((index) => (index + 1) % messages.length), 4500);
    return () => window.clearInterval(interval);
  }, [messages.length, paused, reduceMotion]);

  const message = messages[active % messages.length];
  return <aside className="festival-sale-bar fixed inset-x-0 top-0 z-[60] h-11 overflow-hidden text-white" aria-label="LitePuff festive offers" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <div className="mx-auto grid h-full max-w-7xl grid-cols-[24px_1fr_auto] items-center gap-2 px-4 sm:grid-cols-[120px_1fr_120px] sm:px-6 lg:px-10">
      <span className="flex items-center gap-2 text-[#E8C66E]" aria-hidden="true"><span className="text-xs">✦</span><span className="hidden text-[10px] font-bold uppercase tracking-[.2em] sm:inline">LitePuff</span></span>
      <div className="relative flex h-full items-center justify-center overflow-hidden text-center" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}><motion.p key={`${message.title}-${message.detail}`} className="absolute inset-x-0 truncate text-[10px] font-semibold uppercase tracking-[.08em] sm:text-xs sm:tracking-[.12em]" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }} transition={{ duration: reduceMotion ? .15 : .3, ease: 'easeOut' }}><strong className="text-[#FFF4D2]">{message.title}</strong><span className="mx-2 text-[#E8C66E]">·</span>{message.detail}</motion.p></AnimatePresence>
      </div>
      <Link to="/products" className="group inline-flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-[.08em] text-[#FFF4D2] sm:text-xs" aria-label="Shop LitePuff offers">Shop <span className="hidden sm:inline">Offers</span><FiArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link>
    </div>
  </aside>;
}
