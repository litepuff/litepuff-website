import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import brandStoryImage from '../assets/images/story/brand-story.png';

export default function HomeStory() {
  const reduceMotion = useReducedMotion();
  return <section className="bg-[#FAF8F2] px-5 py-16 sm:px-6 md:py-24 lg:px-10" aria-labelledby="home-story-title">
    <motion.div className="mx-auto grid max-w-7xl items-center gap-9 md:grid-cols-[1.08fr_.92fr] md:gap-14 lg:gap-20" initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .18 }} transition={{ duration: .6 }}>
      <div className="relative md:pr-6"><div className="overflow-hidden rounded-[26px] bg-[#EEE7DA]"><img src={brandStoryImage} alt="LitePuff snacks in a warm everyday setting" className="block h-auto w-full object-contain" loading="lazy" decoding="async" /></div><span className="absolute -bottom-5 right-0 hidden h-28 w-28 border-b border-r border-[#C89B3C] md:block" aria-hidden="true" /></div>
      <div><p className="text-xs font-bold uppercase tracking-[.28em] text-[#A97826]">Our Story</p><h2 id="home-story-title" className="mt-4 font-display text-[42px] font-semibold leading-[.96] tracking-[-.035em] text-[#243029] sm:text-5xl lg:text-[58px]">Snacking should feel good.</h2><div className="mt-6 max-w-xl space-y-4 text-base leading-7 text-[#56605A]"><p>LitePuff was created with a simple thought — everyday snacking can be delicious, exciting and thoughtfully made.</p><p>We bring together crunchy makhana and bold flavours to make snack time a little lighter, without making it boring.</p></div><Link to="/about" className="group mt-7 inline-flex items-center gap-2 border-b border-[#1E4D3A] pb-1 text-sm font-bold text-[#1E4D3A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C]">Discover Our Story <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link></div>
    </motion.div>
  </section>;
}
