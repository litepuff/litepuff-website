import { motion } from 'framer-motion';

export default function EditorialQuote({ children }) {
  return (
    <motion.blockquote initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.6 }} className="my-14 border-y border-[#DED8CC] py-10 text-center font-display text-[32px] font-semibold italic leading-[1.2] tracking-[-0.025em] text-[#243029] md:my-16 md:text-[40px]">
      “{children}”
    </motion.blockquote>
  );
}
