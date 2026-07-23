import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCheck, FiCopy, FiTag, FiX } from 'react-icons/fi';

export default function FloatingCoupon() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText('LITEPUFF20');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] left-3 z-30 md:bottom-6 md:left-6">
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="relative mb-2 w-[min(280px,calc(100vw-24px))] rounded-2xl border border-[#DFD3B8] bg-[#FAF8F3] p-4 shadow-[0_18px_45px_rgba(31,94,59,0.18)]"
            role="dialog"
            aria-label="Online payment coupon"
          >
            <button type="button" onClick={() => setOpen(false)} className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full text-[#68706B] hover:bg-white" aria-label="Close coupon">
              <FiX aria-hidden="true" />
            </button>
            <p className="pr-10 text-sm font-semibold text-[#243029]">Save 20% on Online Payment</p>
            <p className="mt-1 text-xs leading-5 text-[#5F6762]">Use coupon LITEPUFF20 at checkout.</p>
            <button type="button" onClick={copyCode} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1F5E3B] px-4 text-xs font-bold text-white">
              {copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy Code'}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        whileTap={{ scale: 0.98 }}
        className="flex h-11 items-center gap-2 rounded-full border border-[#DDCDAA] bg-[#FAF8F3] px-3 text-left shadow-[0_8px_24px_rgba(31,94,59,0.16)] transition-transform md:hover:-translate-y-0.5"
        aria-expanded={open}
        aria-label="Show 20 percent online payment coupon"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#1F5E3B] text-white"><FiTag className="h-3.5 w-3.5" aria-hidden="true" /></span>
        <strong className="whitespace-nowrap text-xs text-[#1F5E3B]">20% OFF</strong>
      </motion.button>
    </div>
  );
}
