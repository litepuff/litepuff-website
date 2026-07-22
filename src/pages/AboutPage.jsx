import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Ban,
  Flame,
  HeartPulse,
  Leaf,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Users,
  WheatOff,
} from 'lucide-react';
import Seo from '../components/Seo.jsx';
import philosophyImage from '../assets/images/about/philosophy/editorial-opening.png';
import growingImage from '../assets/images/about/future/growing-snacks.png';
import closingImage from '../assets/images/about/closing/closing-editorial.png';

const reveal = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

const features = [
  { icon: Flame, title: '100% Roasted', description: 'Never fried for a lighter and healthier crunch.' },
  { icon: Leaf, title: 'Premium Ingredients', description: 'Only carefully selected ingredients go into every pack.' },
  { icon: Sparkles, title: 'Bold Flavours', description: 'Crafted to deliver satisfying taste without compromise.' },
  { icon: WheatOff, title: 'No Maida', description: 'Made without refined flour.' },
  { icon: Ban, title: 'Gluten Free', description: 'Perfect for conscious everyday snacking.' },
  { icon: BadgeCheck, title: 'Quality Checked', description: 'Every batch is carefully inspected before packing.' },
  { icon: PackageCheck, title: 'Freshly Packed', description: 'Packed to preserve freshness and flavour.' },
  { icon: HeartPulse, title: 'Made for Everyday Snacking', description: 'Perfect for work, travel, study and family moments.' },
];

const journey = [
  { label: '2026', title: 'LitePuff Begins', description: 'Launching our signature roasted makhana collection with a vision of healthier everyday snacking.', icon: Leaf },
  { label: 'Growing Together', title: 'Listening First', description: 'Listening to customers and continuously improving recipes, flavours and quality.', icon: Users },
  { label: 'Innovation', title: 'Beyond the Familiar', description: 'Expanding beyond makhana with healthier alternatives for modern lifestyles.', icon: Sparkles },
  { label: 'The Future', title: 'More Ways to Snack', description: 'Launching LitePuff Chips, new snack categories and exciting innovations.', icon: PackageCheck },
];

const promises = [
  { icon: ShieldCheck, title: 'Quality First', description: 'We never compromise on quality.' },
  { icon: Leaf, title: 'Honest Ingredients', description: 'Simple ingredients with complete transparency.' },
  { icon: PackageCheck, title: 'Freshness Guaranteed', description: 'Every pack is sealed to maintain freshness and taste.' },
  { icon: HeartPulse, title: 'Customer Happiness', description: 'Your trust and satisfaction remain our highest priority.' },
];

function Eyebrow({ children }) { return <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C89B3C]">{children}</p>; }

export default function AboutPage() {
  return <><Seo title="About LitePuff" description="The LitePuff story, standards and promise behind healthier everyday snacking." path="/about" /><main className="bg-[#FAF8F2] text-[#243029]">
    <section className="px-6 py-12 md:py-16 lg:px-8 lg:py-20" aria-labelledby="about-title"><motion.div className="mx-auto grid max-w-7xl items-center gap-8 md:grid-cols-2 md:gap-10 lg:gap-12" initial="hidden" animate="visible"><motion.div variants={reveal}><Eyebrow>Our Story</Eyebrow><h1 id="about-title" className="mt-3 font-display text-[46px] font-semibold leading-[0.98] tracking-[-0.04em] md:text-[54px]">Better snacks begin with better choices.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-[#4E5550]">LitePuff began with a simple belief: healthier snacking should still feel delicious. We pair carefully selected ingredients with patient roasting and balanced flavour, creating food that fits naturally into modern everyday life.</p><p className="mt-4 max-w-xl text-base leading-7 text-[#5F6762]">No complicated promises. Just thoughtful snacks made with care, shared honestly and improved by listening.</p></motion.div><motion.div className="overflow-hidden rounded-[28px]" variants={reveal}><img src={philosophyImage} alt="A warm, natural LitePuff snacking moment" className="aspect-[4/3] w-full object-cover" decoding="async" /></motion.div></motion.div></section>

    <section className="border-y border-[#E2DBCF] bg-white px-6 py-12 md:py-16 lg:px-8 lg:py-20" aria-labelledby="why-title"><div className="mx-auto max-w-7xl"><motion.header className="max-w-[760px]" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={reveal}><Eyebrow>Our Standards</Eyebrow><h2 id="why-title" className="mt-3 font-display text-[44px] font-semibold leading-none tracking-[-0.04em] md:text-[48px]">Why Choose LitePuff</h2><p className="mt-4 text-lg leading-8 text-[#5F6762] md:text-xl">Healthy snacking starts with better ingredients, thoughtful craftsmanship and complete transparency.</p></motion.header><motion.div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.08 }} variants={stagger}>{features.map(({ icon: Icon, title, description }) => <motion.article key={title} className="rounded-[24px] border border-[#E7E1D7] bg-[#FAF8F2] p-5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(36,48,41,0.06)]" variants={reveal}><Icon className="h-7 w-7 text-[#C89B3C]" strokeWidth={1.5} aria-hidden="true" /><h3 className="mt-4 font-display text-[25px] font-semibold leading-tight">{title}</h3><p className="mt-2 text-sm leading-6 text-[#5F6762]">{description}</p></motion.article>)}</motion.div></div></section>

    <section className="px-6 py-12 md:py-16 lg:px-8 lg:py-20" aria-labelledby="journey-title"><motion.div className="mx-auto grid max-w-7xl items-start gap-8 lg:grid-cols-[42%_58%] lg:gap-12" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.12 }}><motion.div className="lg:sticky lg:top-28" variants={reveal}><div className="overflow-hidden rounded-[28px]"><img src={growingImage} alt="LitePuff growing from roasted makhana into a thoughtful snack family" className="aspect-[4/3] w-full object-cover" loading="lazy" decoding="async" /></div><Eyebrow><span className="mt-6 block">Our Journey</span></Eyebrow><h2 id="journey-title" className="mt-3 font-display text-[44px] font-semibold leading-none tracking-[-0.04em] md:text-[48px]">Built one thoughtful step at a time.</h2></motion.div><motion.ol className="relative ml-3 border-l border-[#D8D0C3] pl-8" variants={stagger}>{journey.map(({ label, title, description, icon: Icon }) => <motion.li key={label} className="relative pb-9 last:pb-0" variants={reveal}><span className="absolute -left-[47px] top-0 grid h-9 w-9 place-items-center rounded-full border border-[#D8D0C3] bg-[#FAF8F2] text-[#1E4D3A]"><Icon size={17} strokeWidth={1.5} aria-hidden="true" /></span><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C89B3C]">{label}</p><h3 className="mt-2 font-display text-[30px] font-semibold leading-tight">{title}</h3><p className="mt-2 max-w-lg text-base leading-7 text-[#5F6762]">{description}</p></motion.li>)}</motion.ol></motion.div></section>

    <section className="border-y border-[#E2DBCF] bg-white px-6 py-12 md:py-16 lg:px-8 lg:py-20" aria-labelledby="promise-title"><div className="mx-auto max-w-7xl"><motion.div className="grid items-center gap-8 md:grid-cols-2 md:gap-10 lg:gap-12" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}><motion.div variants={reveal}><Eyebrow>What We Stand For</Eyebrow><h2 id="promise-title" className="mt-3 font-display text-[44px] font-semibold leading-none tracking-[-0.04em] md:text-[48px]">Our Promise</h2><p className="mt-4 max-w-xl text-lg leading-8 text-[#5F6762] md:text-xl">Every pack of LitePuff reflects our commitment to quality, transparency and honest ingredients.</p><div className="mt-8 overflow-hidden rounded-[28px]"><img src={closingImage} alt="LitePuff shared with care in a warm everyday setting" className="aspect-[16/10] w-full object-cover" loading="lazy" decoding="async" /></div></motion.div><motion.div className="grid gap-4 sm:grid-cols-2" variants={stagger}>{promises.map(({ icon: Icon, title, description }) => <motion.article key={title} className="flex min-h-[180px] flex-col rounded-[24px] border border-[#E7E1D7] bg-[#FAF8F2] p-5 transition-transform duration-300 hover:-translate-y-1" variants={reveal}><Icon className="h-7 w-7 text-[#C89B3C]" strokeWidth={1.5} aria-hidden="true" /><h3 className="mt-auto pt-6 font-display text-[26px] font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#5F6762]">{description}</p></motion.article>)}</motion.div></motion.div></div></section>

    <section className="px-6 py-12 text-center md:py-16 lg:px-8 lg:py-20" aria-labelledby="about-closing-title"><motion.div className="mx-auto max-w-2xl" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={reveal}><Eyebrow>Snack Better</Eyebrow><h2 id="about-closing-title" className="mt-3 font-display text-[42px] font-semibold leading-none md:text-[48px]">This is only the beginning.</h2><p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#5F6762]">We are building a more thoughtful snack shelf—one honest ingredient, balanced flavour and everyday moment at a time.</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/shop" className="inline-flex h-12 items-center justify-center rounded-full bg-[#1E4D3A] px-7 text-base font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C]">Shop LitePuff</Link><Link to="/contact" className="inline-flex h-12 items-center justify-center rounded-full border border-[#1E4D3A] px-7 text-base font-semibold text-[#1E4D3A] transition-colors hover:bg-[#1E4D3A] hover:text-white">Talk to Us</Link></div></motion.div></section>
  </main></>;
}
