import { motion } from 'framer-motion';

export default function EditorNote({ children }) {
  return (
    <motion.aside initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mx-auto mt-12 max-w-[760px] rounded-3xl border border-[#ECE7DD] bg-white p-6 shadow-[0_10px_30px_rgba(36,48,41,0.035)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C89B3C]">Editor&apos;s Note</p>
      <p className="mt-4 text-base leading-[1.8] text-[#4E5550]">{children}</p>
    </motion.aside>
  );
}
