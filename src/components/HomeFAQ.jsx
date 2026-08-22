import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Minus, Plus } from 'lucide-react';

const questions = [
  { question: 'What is LitePuff?', answer: 'LitePuff is a snack brand bringing together roasted makhana and bold flavours for everyday snacking.' },
  { question: 'What is makhana?', answer: 'Makhana is the lotus seed used as the base of LitePuff’s current roasted makhana range.' },
  { question: 'Are LitePuff snacks roasted?', answer: 'The current LitePuff makhana range is roasted and never deep-fried. Check each product page and physical pack for product-specific information.' },
  { question: 'Which flavour should I try first?', answer: 'Taste is personal. Browse the current flavour range or build a combo to choose more than one.' },
  { question: 'How should I store my makhana?', answer: 'Follow the storage instructions on the physical pack and keep the container properly closed to help preserve freshness and crunch.' },
  { question: 'Where can I buy LitePuff?', answer: 'You can shop the current LitePuff range directly through this website. Official marketplace links will appear here when configured.' },
];

export default function HomeFAQ() {
  const [open, setOpen] = useState(0);
  const reduceMotion = useReducedMotion();
  return <section className="bg-[#FAF8F2] px-5 py-16 sm:px-6 md:py-24 lg:px-10" aria-labelledby="home-faq-title"><div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[.72fr_1.28fr] md:gap-16 lg:gap-24">
    <div className="md:sticky md:top-36 md:self-start"><p className="text-xs font-bold uppercase tracking-[.28em] text-[#A97826]">Good to Know</p><h2 id="home-faq-title" className="mt-4 max-w-md font-display text-[42px] font-semibold leading-[.98] tracking-[-.035em] text-[#243029] sm:text-5xl">Got questions? We&apos;ve got answers.</h2><Link to="/faq" className="group mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#1E4D3A]">View All FAQs <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link></div>
    <div className="border-t border-[#CFC5B6]">{questions.map((item, index) => { const expanded = open === index; return <article key={item.question} className="border-b border-[#CFC5B6]"><h3><button type="button" onClick={() => setOpen(expanded ? -1 : index)} className="flex w-full items-center justify-between gap-5 py-5 text-left font-display text-[22px] font-semibold leading-tight text-[#243029] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] sm:text-2xl" aria-expanded={expanded} aria-controls={`home-faq-panel-${index}`}><span>{item.question}</span><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#BFB4A4] text-[#1E4D3A]">{expanded ? <Minus size={15} /> : <Plus size={15} />}</span></button></h3><AnimatePresence initial={false}>{expanded && <motion.div id={`home-faq-panel-${index}`} initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? .1 : .25 }} className="overflow-hidden"><p className="max-w-2xl pb-6 pr-10 text-sm leading-7 text-[#5D655F]">{item.answer}</p></motion.div>}</AnimatePresence></article>; })}</div>
  </div></section>;
}
