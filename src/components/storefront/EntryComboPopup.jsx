import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiArrowRight, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import periPeriImage from '../../assets/images/products/peri-peri.png';

const SESSION_KEY = 'litepuff_product_recommendation_seen';

export default function EntryComboPopup() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return undefined;
    const showTimer = window.setTimeout(() => setOpen(true), 5000);
    return () => window.clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const hideTimer = window.setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, '1');
      setOpen(false);
    }, 6000);
    return () => window.clearTimeout(hideTimer);
  }, [open]);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && <motion.aside initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -18, y: 8 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -12 }} transition={{ duration: reduceMotion ? 0.15 : 0.35, ease: 'easeOut' }} aria-label="Product recommendation" className="fixed bottom-[5.5rem] left-4 z-[45] w-[calc(100%-2rem)] max-w-[360px] overflow-hidden rounded-[18px] border border-[#DED7CB] bg-[#FFFEFA] shadow-[0_16px_42px_rgba(36,48,41,.16)] sm:bottom-6 sm:left-6">
        <button type="button" onClick={dismiss} aria-label="Dismiss product recommendation" className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white text-[#526058] ring-1 ring-[#E4DDD1] transition hover:text-[#1E4D3A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1E4D3A]"><FiX /></button>
        <div className="grid grid-cols-[104px_1fr]">
          <div className="grid min-h-[150px] place-items-center bg-[#F4EFE5] p-3"><img src={periPeriImage} alt="Peri Peri Makhana" className="h-32 w-full object-contain" /></div>
          <div className="flex min-w-0 flex-col justify-center p-4 pr-10"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#A97826]">Popular right now</p><h2 className="mt-2 font-display text-[22px] font-semibold leading-tight text-[#243029]">Peri Peri Makhana</h2><p className="mt-1 text-sm text-[#68706B]">A LitePuff favourite.</p><Link to="/products/peri-peri-makhana" onClick={dismiss} className="group mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#1E4D3A]">Shop Now <FiArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link></div>
        </div>
      </motion.aside>}
    </AnimatePresence>
  );
}
