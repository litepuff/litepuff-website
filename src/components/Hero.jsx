import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';
import productHero from '../assets/images/hero/product-hero.png';

export default function Hero() {
  const reduceMotion = useReducedMotion();
  return <section className="home-hero relative isolate overflow-hidden bg-[#F3E8D3]" aria-label="LitePuff makhana collection">
    <picture className="absolute inset-x-0 top-0 -z-10 block aspect-[1672/941] w-full md:inset-0 md:h-full md:aspect-auto">
      <img src={productHero} alt="" width="1672" height="941" className="h-full w-full object-contain object-top md:object-cover md:object-center" fetchPriority="high" loading="eager" decoding="async" aria-hidden="true" />
    </picture>
    <div className="absolute inset-x-0 bottom-0 -z-[5] h-[62%] bg-gradient-to-t from-[#F3E8D3] via-[#F3E8D3]/95 to-transparent md:inset-y-0 md:left-0 md:right-auto md:h-full md:w-[58%] md:bg-gradient-to-r md:from-[#F3E8D3] md:via-[#F3E8D3]/90 md:to-transparent" aria-hidden="true" />
    <div className="home-hero-content relative mx-auto flex min-h-[540px] max-w-[1440px] items-end pt-[55vw] md:min-h-[560px] md:items-center md:pt-0 lg:min-h-[620px]">
      <motion.div className="hero-copy w-full min-w-0 px-5 pb-11 pt-8 text-center sm:px-8 md:max-w-[52%] md:px-10 md:py-12 md:text-left lg:pl-20 xl:pl-24" initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .55, ease: 'easeOut' }}>
        <p className="font-sans text-[11px] font-bold uppercase tracking-[.22em] text-[#A97826] sm:text-xs sm:tracking-[.32em]">Lighter. Smarter. Everyday.</p>
        <h1 className="mt-3 font-display text-[46px] font-semibold leading-[.92] tracking-[-.045em] text-[#243029] sm:text-[56px] lg:text-[72px]">Crunch Better.<br />Snack Lighter.</h1>
        <p className="mx-auto mt-5 max-w-[420px] text-[15px] leading-7 text-[#5F6762] md:mx-0 md:text-base">Five bold flavours, one satisfying everyday crunch.</p>
        <Link to="/products" className="group mt-7 inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-[#174F3D] px-8 text-base font-semibold text-white transition-colors hover:bg-[#28624F]">Shop Makhana <FiArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link>
      </motion.div>
    </div>
  </section>;
}
