import { motion, useReducedMotion } from 'framer-motion';
import { Flame, Leaf, BadgeCheck, PackageCheck } from 'lucide-react';

const benefits = [
  { icon: Flame, title: 'Roasted', description: 'Never fried for a lighter and healthier crunch.' },
  { icon: Leaf, title: 'Premium Ingredients', description: 'Only carefully selected ingredients go into every pack.' },
  { icon: BadgeCheck, title: 'Quality Checked', description: 'Every batch is carefully inspected before packing.' },
  { icon: PackageCheck, title: 'Freshly Packed', description: 'Packed to preserve freshness and flavour.' },
];

export default function WhyLitePuff() {
  const reduceMotion = useReducedMotion();
  return <section className="bg-[#FAF8F2] px-5 py-12 sm:px-6 md:py-14 lg:px-10" aria-labelledby="why-litepuff-title">
    <div className="mx-auto max-w-7xl">
      <motion.header className="grid gap-4 border-b border-[#DDD5C8] pb-7 md:grid-cols-[.8fr_1.2fr] md:items-end" initial={reduceMotion ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .35 }}>
        <p className="text-xs font-bold uppercase tracking-[.28em] text-[#A97826]">Why LitePuff</p>
        <h2 id="why-litepuff-title" className="max-w-2xl font-display text-[36px] font-semibold leading-[.98] tracking-[-.03em] text-[#243029] sm:text-[42px]">Good snacking starts with how it&apos;s made.</h2>
      </motion.header>
      <div className="mt-7 grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map(({ icon: Icon, title, description }, index) => <motion.article key={title} className="grid grid-cols-[42px_1fr] gap-3 lg:block lg:border-l lg:border-[#DDD5C8] lg:pl-5 first:lg:border-l-0 first:lg:pl-0" initial={reduceMotion ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .4 }} transition={{ duration: reduceMotion ? 0 : .4, delay: reduceMotion ? 0 : index * .06 }}>
          <div className="grid h-10 w-10 place-items-center rounded-full border border-[#D6C8A5] text-[#1E4D3A]"><Icon size={18} strokeWidth={1.5} aria-hidden="true" /></div>
          <div className="lg:mt-4"><p className="text-[10px] font-bold tracking-[.18em] text-[#A97826]">{String(index + 1).padStart(2, '0')}</p><h3 className="mt-1 font-display text-[23px] font-semibold leading-tight text-[#243029]">{title}</h3><p className="mt-1.5 text-sm leading-6 text-[#606862]">{description}</p></div>
        </motion.article>)}
      </div>
    </div>
  </section>;
}
