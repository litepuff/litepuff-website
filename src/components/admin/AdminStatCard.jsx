import { motion } from 'framer-motion';

export default function AdminStatCard({ label, value, hint }) {
  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">{label}</p>
      <strong className="mt-2 block font-display text-3xl font-semibold text-brand-text">{value}</strong>
      {hint ? <p className="mt-2 text-sm text-brand-muted">{hint}</p> : null}
    </motion.article>
  );
}
