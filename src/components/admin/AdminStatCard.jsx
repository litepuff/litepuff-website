import { motion } from 'framer-motion';

export default function AdminStatCard({ label, value, hint }) {
  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="rounded-[24px] border border-brand-border bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-muted">{label}</p>
      <strong className="mt-3 block font-display text-3xl font-black text-brand-text">{value}</strong>
      {hint ? <p className="mt-2 text-sm text-brand-muted">{hint}</p> : null}
    </motion.article>
  );
}
