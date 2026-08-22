import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Flame, Sparkles, Users } from 'lucide-react';

const promises = [
  { icon: Flame, title: 'Carefully Roasted', description: 'A satisfying crunch without the heaviness of traditional fried snacking.' },
  { icon: Sparkles, title: 'Bold Flavours', description: "From fiery Peri Peri to refreshing Mint, there's a flavour for every craving." },
  { icon: Users, title: 'Made to Share', description: 'Pick your favourites, build your combo and make snack time better.' },
];

export default function BrandPromise() {
  const reduceMotion = useReducedMotion();
  return <section className="border-y border-white/10 bg-[#1E4D3A] px-5 py-16 text-white sm:px-6 md:py-20 lg:px-10" aria-labelledby="brand-promise-title"><div className="mx-auto max-w-7xl">
    <div className="grid gap-5 border-b border-white/15 pb-8 md:grid-cols-[.9fr_1.1fr] md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.28em] text-[#E4C46E]">Why LitePuff</p><h2 id="brand-promise-title" className="mt-3 font-display text-[42px] font-semibold leading-none tracking-[-.03em] sm:text-5xl">Made for the way you snack.</h2></div><p className="max-w-xl text-base leading-7 text-white/70 md:justify-self-end">Thoughtfully made for everyday cravings, from the first crunch to the last bite.</p></div>
    <div className="grid md:grid-cols-3">{promises.map(({ icon: Icon, title, description }, index) => <motion.article key={title} className="border-b border-white/15 py-7 last:border-b-0 md:border-b-0 md:border-r md:px-8 md:py-10 first:md:pl-0 last:md:border-r-0 last:md:pr-0" initial={reduceMotion ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .4 }} transition={{ duration: .45, delay: reduceMotion ? 0 : index * .08 }}><div className="flex items-center justify-between"><span className="text-xs font-bold tracking-[.2em] text-[#E4C46E]">0{index + 1}</span><Icon size={21} strokeWidth={1.4} className="text-white/55" aria-hidden="true" /></div><h3 className="mt-6 font-display text-2xl font-semibold uppercase tracking-[.02em]">{title}</h3><p className="mt-3 max-w-sm text-sm leading-6 text-white/68">{description}</p></motion.article>)}</div>
    <Link to="/products" className="group mt-2 inline-flex items-center gap-2 border-b border-[#E4C46E] pb-1 text-sm font-bold text-white">Shop All Flavours <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link>
  </div></section>;
}
