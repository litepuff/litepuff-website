import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Flame,
  Leaf,
  PackageCheck,
  Sparkles,
} from 'lucide-react';
import brandStoryImage from '../assets/images/story/brand-story.png';

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const timeline = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const ritualSteps = [
  { number: '01', icon: Leaf, title: 'Carefully Selected Ingredients', description: 'Premium lotus seeds chosen for size, texture and consistency.' },
  { number: '02', icon: Flame, title: 'Slow Roasting', description: 'Patient heat develops a naturally light, satisfying crunch.' },
  { number: '03', icon: Sparkles, title: 'Expert Seasoning', description: 'Balanced blends coat every warm seed with flavour.' },
  { number: '04', icon: PackageCheck, title: 'Fresh Packaging', description: 'Prompt sealing protects aroma, texture and freshness.' },
  { number: '05', icon: BadgeCheck, title: 'Delivered Fresh', description: 'Carefully packed so every jar arrives ready to enjoy.' },
];

export default function LitePuffRitual() {
  return (
    <div className="bg-white">
      <section className="px-6 py-12 md:py-16 lg:px-8 lg:py-20" aria-labelledby="litepuff-ritual-title">
        <div className="mx-auto max-w-7xl">
          <motion.header className="max-w-[720px]" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={reveal}>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C89B3C]">The LitePuff Ritual</p>
            <h2 id="litepuff-ritual-title" className="mt-3 font-display text-[44px] font-semibold leading-none tracking-[-0.04em] text-[#243029] md:text-[48px]">From Ingredient to Everyday Crunch</h2>
            <p className="mt-4 max-w-[620px] text-base leading-7 text-[#5F6762] md:text-lg">Five considered steps. One honest, flavourful snack.</p>
          </motion.header>

          <motion.ol className="relative mt-10 grid gap-0 md:grid-cols-5" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.12 }} variants={timeline} aria-label="How LitePuff is made">
            <span className="absolute left-[10%] right-[10%] top-[31px] hidden h-px bg-[#DCD4C7] md:block" aria-hidden="true" />
            {ritualSteps.map(({ number, icon: Icon, title, description }, index) => (
              <motion.li key={number} className="relative grid grid-cols-[64px_1fr] gap-4 border-l border-[#DCD4C7] pb-8 pl-5 last:pb-0 md:block md:border-l-0 md:px-3 md:pb-0 md:pl-3 md:text-center" variants={reveal}>
                <div className="relative z-10 grid h-16 w-16 place-items-center rounded-full border border-[#DCD4C7] bg-white text-[#1E4D3A] md:mx-auto"><Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" /></div>
                <div><p className="text-xs font-semibold tracking-[0.18em] text-[#C89B3C] md:mt-5">{number}</p><h3 className="mt-2 font-display text-[22px] font-semibold leading-[1.1] text-[#243029]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#5F6762]">{description}</p></div>
                {index < ritualSteps.length - 1 ? <span className="absolute -bottom-1 -left-[4.5px] h-2 w-2 rounded-full bg-[#C89B3C] md:hidden" aria-hidden="true" /> : null}
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      <section className="bg-[#FAF8F2] px-6 py-12 md:py-16 lg:px-8 lg:py-20" aria-labelledby="brand-story-title">
        <motion.div className="mx-auto grid max-w-7xl items-center gap-8 md:grid-cols-[52%_48%] md:gap-10 lg:gap-12" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }}>
          <motion.div className="overflow-hidden rounded-[28px]" variants={reveal}>
            <motion.img src={brandStoryImage} alt="LitePuff snacks thoughtfully crafted and shared in warm natural light" className="aspect-[4/3] w-full object-cover" loading="lazy" decoding="async" whileHover={{ scale: 1.02 }} transition={{ duration: 0.4, ease: 'easeOut' }} />
          </motion.div>
          <motion.div className="md:pl-2" variants={reveal}>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C89B3C]">Our Story</p>
            <h2 id="brand-story-title" className="mt-3 font-display text-[44px] font-semibold leading-[0.98] tracking-[-0.04em] text-[#243029] md:text-[48px]">Crafted with Care.<br />Shared with Love.</h2>
            <p className="mt-5 max-w-[560px] text-base leading-7 text-[#4E5550] md:text-lg">LitePuff was created with one simple belief—that healthier snacking should never compromise on taste. Every pack is thoughtfully crafted using premium ingredients, slow roasting techniques and carefully balanced flavours to bring you a snack you&apos;ll genuinely enjoy.</p>
            <Link to="/about" className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-[#1E4D3A] px-7 text-base font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C]">Learn More</Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
