import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCheck, FiCopy, FiTag, FiX } from 'react-icons/fi';

export default function FloatingCoupon() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try { await navigator.clipboard.writeText('LITEPUFF20'); } catch { /* Clipboard may be unavailable on non-secure previews. */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 md:bottom-6 md:left-6">
      <AnimatePresence>{open && <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} className="mb-3 w-[min(330px,calc(100vw-32px))] rounded-[24px] border border-[#DFD3B8] bg-[#FAF8F3] p-5 shadow-[0_20px_55px_rgba(31,94,59,0.18)]" role="dialog" aria-label="Online payment coupon"><button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-[#68706B] hover:bg-white" aria-label="Close coupon"><FiX /></button><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A7A18]">Online payment offer</p><h2 className="mt-2 font-display text-3xl font-semibold text-[#243029]">Save 20% instantly</h2><p className="mt-2 text-sm leading-6 text-[#5F6762]">Apply manually during prepaid checkout.</p><div className="mt-5 flex items-center justify-between rounded-2xl border border-dashed border-[#C9A227] bg-white px-4 py-3"><strong className="tracking-[0.12em] text-[#1F5E3B]">LITEPUFF20</strong><button type="button" onClick={copyCode} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1F5E3B]">{copied ? <FiCheck /> : <FiCopy />}{copied ? 'Copied' : 'Copy'}</button></div></motion.div>}</AnimatePresence>
      <motion.button type="button" onClick={() => setOpen((value) => !value)} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} className="flex h-[54px] items-center gap-3 rounded-full border border-[#DDCDAA] bg-[#FAF8F3] px-4 text-left shadow-[0_10px_30px_rgba(31,94,59,0.16)]" aria-expanded={open}><span className="grid h-8 w-8 place-items-center rounded-full bg-[#1F5E3B] text-white"><FiTag /></span><span><span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#7D715E]">Online Payment</span><strong className="block text-sm leading-none text-[#1F5E3B]">20% OFF</strong></span></motion.button>
    </div>
  );
}
