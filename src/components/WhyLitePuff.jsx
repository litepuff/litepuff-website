import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Ban,
  Flame,
  HeartPulse,
  Leaf,
  WheatOff,
} from 'lucide-react';
import lifestyleBanner from '../assets/images/why-litepuff/lifestyle.png';
import morningImage from '../assets/images/lifestyle/morning-tea.png';
import officeImage from '../assets/images/lifestyle/office-break.png';
import travelImage from '../assets/images/lifestyle/travel.png';
import movieImage from '../assets/images/lifestyle/movie-night.png';

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const features = [
  { icon: Leaf, title: 'Premium Ingredients', description: 'Carefully chosen ingredients with quality you can taste in every bite.' },
  { icon: Flame, title: 'Slow Roasted', description: 'Patient roasting creates our signature light and satisfying crunch.' },
  { icon: Ban, title: 'Never Fried', description: 'A lighter approach to snacking, without a deep fryer in sight.' },
  { icon: BadgeCheck, title: 'Gluten Free', description: 'Naturally simple snacking made for more everyday routines.' },
  { icon: WheatOff, title: 'No Maida', description: 'Made without refined flour, because better choices start at the source.' },
  { icon: HeartPulse, title: 'Made for Everyday Snacking', description: 'Balanced flavour and crunch for desks, journeys and slow evenings.' },
];

const moments = [
  { title: 'Morning Energy', description: 'A lighter start beside your morning cup.', image: morningImage, alt: 'LitePuff makhana served with morning tea' },
  { title: 'Office Break', description: 'A satisfying pause between busy moments.', image: officeImage, alt: 'LitePuff snack during a relaxed office break' },
  { title: 'Travel Companion', description: 'Clean, convenient crunch wherever you go.', image: travelImage, alt: 'LitePuff accompanying a healthy travel moment' },
  { title: 'Movie Night', description: 'Big flavour made for sharing after dark.', image: movieImage, alt: 'LitePuff shared during a family movie night' },
];

export default function WhyLitePuff() {
  return (
    <div className="bg-[#FAF8F2]">
      <section className="px-6 py-12 md:py-16 lg:px-8 lg:py-20" aria-labelledby="why-litepuff-title">
        <div className="mx-auto max-w-7xl">
          <motion.header className="max-w-[760px]" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={reveal}>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C89B3C]">Why LitePuff</p>
            <h2 id="why-litepuff-title" className="mt-3 font-display text-[44px] font-semibold leading-none tracking-[-0.04em] text-[#243029] md:text-[48px]">Why Choose LitePuff</h2>
            <p className="mt-4 max-w-[680px] text-lg leading-8 text-[#4E5550] md:text-xl">Healthy snacking starts with better ingredients, thoughtful craftsmanship and uncompromising quality.</p>
          </motion.header>

          <motion.div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.12 }} variants={stagger}>
            {features.map(({ icon: Icon, title, description }) => (
              <motion.article key={title} className="rounded-[24px] border border-[#E6E0D5] bg-white p-6 shadow-[0_8px_22px_rgba(36,48,41,0.035)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(36,48,41,0.07)]" variants={reveal}>
                <Icon className="h-7 w-7 text-[#C89B3C]" strokeWidth={1.6} aria-hidden="true" />
                <h3 className="mt-5 font-display text-[27px] font-semibold leading-tight text-[#243029]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5F6762]">{description}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-6 md:py-16 lg:px-8 lg:py-20" aria-labelledby="lifestyle-banner-title">
        <motion.div className="relative mx-auto min-h-[440px] max-w-[1320px] overflow-hidden rounded-[28px] md:min-h-[500px]" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal}>
          <img src={lifestyleBanner} alt="LitePuff enjoyed across warm, healthy everyday moments" className="absolute inset-0 h-full w-full object-cover object-center" loading="lazy" decoding="async" />
          <div className="absolute inset-0 bg-black/42" aria-hidden="true" />
          <div className="relative z-10 flex min-h-[440px] items-end px-6 py-9 md:min-h-[500px] md:px-12 md:py-11 lg:px-14">
            <div className="max-w-[560px] text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#F1D48B]">Made For Every Moment</p>
              <h2 id="lifestyle-banner-title" className="mt-3 font-display text-[38px] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-[42px] md:text-[46px]">Good Snacks.<br />Good Moments.</h2>
              <p className="mt-4 max-w-[560px] text-base leading-7 text-white/90 md:text-lg">Whether you&apos;re working, travelling or relaxing at home, LitePuff makes every snack break a little lighter.</p>
              <Link to="/products" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#FAF8F2] px-6 text-sm font-semibold text-[#1E4D3A] shadow-[0_8px_22px_rgba(0,0,0,0.12)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F1D48B]">Shop Collection</Link>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="px-6 py-12 md:py-16 lg:px-8 lg:py-20" aria-labelledby="many-moments-title">
        <div className="mx-auto max-w-7xl">
          <motion.div className="grid gap-5 border-b border-[#DED7CB] pb-8 md:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] md:items-end md:gap-12" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={reveal}>
            <div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C89B3C]">LitePuff Lifestyle</p><h2 id="many-moments-title" className="mt-3 max-w-2xl font-display text-[40px] font-semibold leading-[0.98] tracking-[-0.04em] text-[#243029] md:text-[48px]">One Brand, Many Moments</h2></div>
            <p className="border-l-2 border-[#C89B3C] pl-5 text-base leading-7 text-[#5F6762] md:mb-1">Thoughtful crunch that fits naturally into the rhythm of your day.</p>
          </motion.div>
          <motion.div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}>
            {moments.map((moment) => <motion.article key={moment.title} className="group" variants={reveal} whileHover={{ y: -4 }} transition={{ duration: 0.3, ease: 'easeOut' }}><div className="overflow-hidden rounded-[22px]"><motion.img src={moment.image} alt={moment.alt} className="aspect-[4/3] w-full object-cover" loading="lazy" decoding="async" whileHover={{ scale: 1.025 }} transition={{ duration: 0.35, ease: 'easeOut' }} /></div><h3 className="mt-4 font-display text-[26px] font-semibold text-[#243029]">{moment.title}</h3><p className="mt-1 text-sm leading-6 text-[#5F6762]">{moment.description}</p></motion.article>)}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
