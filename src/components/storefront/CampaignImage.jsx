import { useState } from 'react';
import { FiImage } from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function CampaignImage({ src, mobileSrc, alt = 'LitePuff campaign', placeholder = 'LitePuff Campaign', aspect = 'aspect-video', className = '', fit = 'cover', imageClassName = '' }) {
  const [failed, setFailed] = useState(false);
  const available = Boolean(src) && !failed;
  return (
    <div className={`${aspect} relative overflow-hidden rounded-[24px] border border-[#E2DBCF] bg-[#F3EFE6] ${className}`}>
      {available ? (
        <picture className="block h-full w-full"><source media="(max-width: 639px)" srcSet={mobileSrc || src} /><motion.img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${imageClassName}`} initial={{ opacity: 0, scale: 1.018 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, ease: 'easeOut' }} whileHover={{ scale: 1.012 }} /></picture>
      ) : (
        <div role="img" aria-label={alt} className="campaign-placeholder relative grid h-full w-full place-items-center overflow-hidden p-6 text-center"><div className="relative z-10"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-white/60 bg-white/20 text-white backdrop-blur-sm"><FiImage size={24} aria-hidden="true" /></span><span className="mt-4 block text-xs font-bold uppercase tracking-[.24em] text-white">{placeholder}</span><span className="mt-2 block text-[11px] text-white/75">Final campaign artwork</span></div></div>
      )}
    </div>
  );
}
