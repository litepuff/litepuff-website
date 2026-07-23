import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheckCircle } from 'react-icons/fi';
import heroFallback from '../assets/images/hero/hero-img-1.png';

const heroImageModules = import.meta.glob('../assets/images/hero/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
});

const heroSlides = [
  { id: 'hero-img-1', title: 'LitePuff morning ritual' },
  { id: 'hero-img-2', title: 'LitePuff office break' },
  { id: 'hero-img-3', title: 'LitePuff travel companion' },
  { id: 'hero-img-4', title: 'LitePuff movie night' },
  { id: 'hero-img-5', title: 'LitePuff everyday snacking' },
  { id: 'hero-img-6', title: 'LitePuff shared moments' },
];

const trustBadges = [
  '100% Roasted',
  'Never Fried',
  'Gluten Free',
  'No Maida',
  'Heart Friendly',
  'Premium Ingredients',
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const staggeredBadges = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
};

function resolveHeroImage(slideId) {
  const matchedPath = Object.keys(heroImageModules).find((path) => path.includes(`${slideId}.`));
  return matchedPath ? heroImageModules[matchedPath] : heroFallback;
}

export default function Hero() {
  const slides = useMemo(
    () => heroSlides.map((slide) => ({ ...slide, src: resolveHeroImage(slide.id) })),
    [],
  );
  const activeSlide = slides[0];

  return (
    <section className="home-hero relative overflow-hidden bg-[#243029]" aria-label="LitePuff premium snacks hero">
      <div className="absolute inset-0">
        <img src={activeSlide.src} alt={activeSlide.title} className="absolute inset-0 h-full w-full object-cover object-[62%_center] sm:object-center" loading="eager" fetchPriority="high" decoding="async" onError={(event) => { event.currentTarget.src = heroFallback; }} />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.40)_38%,rgba(0,0,0,0.08)_68%,transparent_100%)]" aria-hidden="true" />

      <div className="home-hero-content relative z-10 mx-auto flex max-w-7xl items-center px-6 py-12 md:py-14 lg:px-10 lg:py-16">
        <div className="hero-copy w-full max-w-[620px] text-center text-white md:text-left">
          <motion.p className="font-sans text-[13px] font-semibold uppercase tracking-[0.35em] text-[#F2D58F]" initial="hidden" animate="visible" variants={fadeUp}>
            Lighter. Smarter. Everyday.
          </motion.p>

          <motion.h1 className="mt-4 font-display text-[42px] font-semibold leading-[0.98] tracking-[-0.045em] text-white sm:text-[50px] md:text-[60px] lg:text-[66px] xl:text-[72px]" initial="hidden" animate="visible" variants={fadeUp}>
            Healthy Snacking,<br />Without Compromise.
          </motion.h1>

          <motion.p className="mx-auto mt-5 max-w-[560px] text-[15px] leading-[1.75] text-white/90 sm:text-base md:mx-0 md:text-lg lg:mt-6" initial="hidden" animate="visible" variants={fadeUp}>
            LitePuff brings together carefully selected ingredients, bold flavours and satisfying crunch to make everyday snacking lighter, healthier and more enjoyable.
          </motion.p>

          {/* Primary Actions */}
          <motion.div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row md:justify-start" initial="hidden" animate="visible" variants={fadeUp}>
            <Link to="/products" className="inline-flex h-[52px] items-center justify-center rounded-full bg-[#FAF8F2] px-8 text-base font-semibold text-[#1E4D3A] transition-colors duration-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F2D58F]">
              Shop Now
            </Link>
            <Link to="/products#flavours" className="inline-flex h-[52px] items-center justify-center rounded-full border border-white/80 px-8 text-base font-semibold text-white transition-colors duration-300 hover:bg-white hover:text-[#1E4D3A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F2D58F]">
              Explore Collection
            </Link>
          </motion.div>

          <motion.div className="mx-auto mt-8 grid max-w-[600px] grid-cols-2 gap-x-3 gap-y-3 text-left sm:grid-cols-3 md:mx-0" initial="hidden" animate="visible" variants={staggeredBadges}>
            {trustBadges.map((badge) => (
              <motion.div key={badge} className="flex min-h-10 items-center gap-2 rounded-xl border border-white/35 bg-black/15 px-3 py-2 text-[12px] font-semibold text-white sm:text-[13px]" variants={fadeUp}>
                <FiCheckCircle className="h-[17px] w-[17px] shrink-0 text-[#F2D58F]" strokeWidth={1.7} aria-hidden="true" />
                <span>{badge}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
