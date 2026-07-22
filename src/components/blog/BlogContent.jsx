import { motion } from 'framer-motion';
import EditorialQuote from './EditorialQuote.jsx';

const reveal = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.15 }, transition: { duration: 0.6, ease: 'easeOut' } };

export default function BlogContent({ sections }) {
  return (
    <div className="mx-auto mt-12 max-w-[760px] md:mt-16">
      {sections.map((section, index) => {
        if (section.type === 'paragraph') return <motion.p key={index} {...reveal} className="mb-7 text-[17px] leading-[1.95] text-[#4E5550] md:text-lg">{section.text}</motion.p>;
        if (section.type === 'heading') return <motion.h2 key={index} {...reveal} className="mb-5 mt-12 font-display text-[30px] font-semibold leading-tight tracking-[-0.03em] text-[#243029] md:mt-14 md:text-[34px]">{section.text}</motion.h2>;
        if (section.type === 'quote') return <EditorialQuote key={index}>{section.text}</EditorialQuote>;
        if (section.type === 'image') return (
          <motion.figure key={index} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6 }} className="my-12 md:my-16">
            <div className="h-[300px] overflow-hidden rounded-[28px] sm:h-[380px] md:h-[460px]"><img src={section.image} alt={section.alt} loading="lazy" className="h-full w-full object-cover" /></div>
            <figcaption className="mt-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#C89B3C]">{section.caption}</figcaption>
          </motion.figure>
        );
        return null;
      })}
    </div>
  );
}
