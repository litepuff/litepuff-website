import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => localStorage.getItem('litepuffCookiePreference') !== 'accepted');
  const accept = () => {
    localStorage.setItem('litepuffCookiePreference', 'accepted');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.35 }} className="fixed bottom-4 left-4 right-4 z-[70] mx-auto max-w-3xl rounded-[24px] border border-[#ECE7DD] bg-white p-5 shadow-2xl md:flex md:items-center md:justify-between md:gap-6">
          <p className="text-sm leading-6 text-[#4E5550]">LitePuff uses essential cookies to remember cart, search and account preferences.</p>
          <button onClick={accept} className="mt-4 h-11 rounded-full bg-[#1E4D3A] px-6 text-sm font-semibold text-white md:mt-0">Accept</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
