import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';

const DISMISS_KEY = 'litepuffAnnouncementDismissedAt';
const DISMISS_DURATION = 24 * 60 * 60 * 1000;

function shouldShow() {
  const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return !dismissedAt || Date.now() - dismissedAt >= DISMISS_DURATION;
}

export default function WelcomeOffer() {
  const [visible, setVisible] = useState(shouldShow);

  useEffect(() => {
    document.documentElement.style.setProperty('--announcement-height', visible ? '42px' : '0px');
    return () => document.documentElement.style.setProperty('--announcement-height', '0px');
  }, [visible]);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.aside initial={{ opacity: 0, y: -42 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -42 }} className="fixed inset-x-0 top-0 z-[60] h-[42px] overflow-hidden border-b border-white/10 bg-[#1F5E3B] text-white" aria-label="Online payment offer">
          <div className="mx-auto flex h-full max-w-7xl items-center justify-center overflow-hidden px-12 text-center sm:px-16">
            <motion.p className="whitespace-nowrap text-[11px] font-medium tracking-[0.01em] sm:text-xs md:text-[13px]" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}><span aria-hidden="true">🎉 </span>Save 20% on Online Payments <span className="mx-2 text-white/40">•</span> Use Code <strong className="text-[#F1D986]">LITEPUFF20</strong></motion.p>
          </div>
          <button type="button" onClick={dismiss} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white sm:right-3" aria-label="Hide offer for 24 hours"><FiX aria-hidden="true" /></button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
