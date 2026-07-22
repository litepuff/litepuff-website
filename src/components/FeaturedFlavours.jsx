import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowRight,
  FiBell,
  FiCheck,
  FiMail,
  FiMessageCircle,
} from 'react-icons/fi';
import makhanaCollectionImage from '../assets/images/collections/makhana-collections.png';
import chipsCollectionImage from '../assets/images/collections/chips-collection.png';
import makhanaProductImage from '../assets/images/products/collection-overview.png';
import chipsEditorialImage from '../assets/images/products/chips-coming-soon.png';

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

const viewport = { once: true, amount: 0.18 };

const collectionBlocks = [
  {
    label: 'Available Now',
    title: 'Roasted Makhana',
    description: 'Crafted from premium lotus seeds and slowly roasted for a lighter crunch, our signature makhana collection delivers bold flavour without compromising on health.',
    highlights: ['5 Signature Flavours', '70gm Pack', 'Never Fried', 'Gluten Free'],
    image: makhanaCollectionImage,
    alt: 'LitePuff roasted makhana collection arranged in an editorial setting',
    cta: 'Explore Collection',
    to: '/products',
  },
  {
    label: 'Coming Soon',
    title: 'LitePuff Chips',
    description: 'A new generation of everyday chips made with smarter ingredients and bold flavours. Launching soon in four delicious varieties.',
    highlights: ['Banana Chips', 'Ragi Chips', 'Beetroot Chips', 'Oats Masala Chips'],
    image: chipsCollectionImage,
    alt: 'Upcoming LitePuff chips collection in a premium lifestyle setting',
    cta: 'Notify Me',
    href: '#litepuff-chips',
  },
];

const flavours = ['Peri Peri', 'Mint', 'Cheese', 'Cream & Onion', 'Salt & Pepper'];
const makhanaFeatures = ['100% Roasted', 'Never Fried', 'Gluten Free', 'No Maida', 'Heart Friendly', 'Premium Ingredients'];
const chipFlavours = ['Banana Chips', 'Ragi Chips', 'Beetroot Chips', 'Oats Masala Chips'];

function EditorialCollection({ collection, index }) {
  const imageFirst = index === 0;
  return (
    <motion.article className="grid items-center gap-8 md:grid-cols-2 md:gap-10 lg:gap-12" initial="hidden" whileInView="visible" viewport={viewport}>
      <motion.div className={imageFirst ? '' : 'md:order-2'} variants={reveal}>
        <div className="overflow-hidden rounded-[28px] bg-[#F1EDE3]">
          <motion.img src={collection.image} alt={collection.alt} className="aspect-[4/3] w-full object-cover" loading="lazy" decoding="async" whileHover={{ scale: 1.02 }} transition={{ duration: 0.5, ease: 'easeOut' }} />
        </div>
      </motion.div>
      <motion.div className={imageFirst ? 'md:pl-2' : 'md:order-1 md:pr-2'} variants={reveal}>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C89B3C]">{collection.label}</p>
        <h3 className="mt-3 font-display text-[42px] font-semibold leading-none tracking-[-0.04em] text-[#243029] md:text-[46px]">{collection.title}</h3>
        <p className="mt-5 max-w-lg text-base leading-7 text-[#4E5550] md:text-lg">{collection.description}</p>
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3">
          {collection.highlights.map((item) => <li key={item} className="flex items-center gap-2 text-sm font-semibold text-[#243029]"><FiCheck className="shrink-0 text-[#C89B3C]" aria-hidden="true" />{item}</li>)}
        </ul>
        {collection.to ? <Link to={collection.to} className="group mt-7 inline-flex items-center gap-2 text-base font-semibold text-[#1E4D3A] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C]">{collection.cta}<FiArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link> : <a href={collection.href} className="group mt-7 inline-flex items-center gap-2 text-base font-semibold text-[#1E4D3A] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C]">{collection.cta}<FiArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></a>}
      </motion.div>
    </motion.article>
  );
}

export default function FeaturedFlavours() {
  return (
    <div id="flavours" className="bg-[#FAF8F2]">
      <section className="px-6 py-12 md:py-16 lg:px-8 lg:py-20" aria-labelledby="shop-by-collection-title">
        <div className="mx-auto max-w-7xl">
          <motion.header className="mb-10 max-w-2xl md:mb-12" initial="hidden" whileInView="visible" viewport={viewport} variants={reveal}>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C89B3C]">Shop by Collection</p>
            <h2 id="shop-by-collection-title" className="mt-3 font-display text-[44px] font-semibold leading-none tracking-[-0.04em] text-[#243029] md:text-[48px]">Find your kind of crunch.</h2>
          </motion.header>
          <div className="space-y-12 md:space-y-16 lg:space-y-20">{collectionBlocks.map((collection, index) => <EditorialCollection key={collection.title} collection={collection} index={index} />)}</div>
        </div>
      </section>

      <section className="bg-white px-6 py-12 md:py-16 lg:px-8 lg:py-20" aria-labelledby="roasted-makhana-title">
        <motion.div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[48%_52%] lg:gap-12" initial="hidden" whileInView="visible" viewport={viewport}>
          <motion.div variants={reveal}>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C89B3C]">Our Signature Collection</p>
            <h2 id="roasted-makhana-title" className="mt-3 font-display text-[44px] font-semibold leading-none tracking-[-0.04em] text-[#243029] md:text-[48px]">Roasted Makhana</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#4E5550] md:text-lg">Carefully selected lotus seeds roasted to perfection and seasoned with thoughtfully crafted flavours for every kind of snacker.</p>
            <div className="mt-6 flex flex-wrap gap-2.5" aria-label="Makhana flavours">{flavours.map((flavour) => <span key={flavour} className="rounded-full border border-[#DDD5C8] bg-white/70 px-4 py-2 text-sm font-medium text-[#36423B] shadow-[0_2px_8px_rgba(36,48,41,0.03)]">{flavour}</span>)}</div>
            <ul className="mt-7 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3">{makhanaFeatures.map((feature) => <li key={feature} className="flex items-center gap-2 text-sm font-medium text-[#4E5550]"><FiCheck className="shrink-0 text-[#C89B3C]" aria-hidden="true" />{feature}</li>)}</ul>
            <Link to="/products" className="mt-8 inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-[#1E4D3A] px-8 text-base font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C]">Shop Makhana<FiArrowRight aria-hidden="true" /></Link>
          </motion.div>
          <motion.div className="mx-auto w-full max-w-[620px] overflow-hidden rounded-[28px] bg-[#FAF8F2] p-6 md:p-8" variants={reveal}>
            <motion.img src={makhanaProductImage} alt="LitePuff signature roasted makhana flavours" className="aspect-[4/3] w-full object-contain" loading="lazy" decoding="async" whileHover={{ scale: 1.02 }} transition={{ duration: 0.5, ease: 'easeOut' }} />
          </motion.div>
        </motion.div>
      </section>

      <section id="litepuff-chips" className="scroll-mt-24 px-6 py-12 md:py-16 lg:px-8 lg:py-20" aria-labelledby="litepuff-chips-title">
        <motion.div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[52%_48%] lg:gap-12" initial="hidden" whileInView="visible" viewport={viewport}>
          <motion.div className="overflow-hidden rounded-[28px] bg-[#F1EDE3] p-5 md:p-8" variants={reveal}>
            <motion.img src={chipsEditorialImage} alt="Preview of the upcoming LitePuff chips collection" className="aspect-[4/3] w-full object-contain" loading="lazy" decoding="async" whileHover={{ scale: 1.02 }} transition={{ duration: 0.5, ease: 'easeOut' }} />
          </motion.div>
          <motion.div variants={reveal}>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C89B3C]">Coming Soon</p>
            <h2 id="litepuff-chips-title" className="mt-3 font-display text-[44px] font-semibold leading-none tracking-[-0.04em] text-[#243029] md:text-[48px]">LitePuff Chips</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#4E5550] md:text-lg">Our first chip collection is almost here. Crafted with smarter ingredients and the same LitePuff philosophy of flavour-first snacking.</p>
            <ul className="mt-6 grid grid-cols-2 gap-3">{chipFlavours.map((flavour) => <li key={flavour} className="text-sm font-semibold text-[#243029]">{flavour}</li>)}</ul>
            <div className="mt-8 flex flex-wrap gap-3" aria-label="Launch notification options">
              <button type="button" className="inline-flex h-12 items-center gap-2 rounded-full border border-[#1E4D3A] px-5 text-sm font-semibold text-[#1E4D3A] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C]"><FiMessageCircle aria-hidden="true" />Notify via WhatsApp</button>
              <button type="button" className="inline-flex h-12 items-center gap-2 rounded-full border border-[#1E4D3A] px-5 text-sm font-semibold text-[#1E4D3A] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C]"><FiMail aria-hidden="true" />Notify via Email</button>
              <button type="button" className="inline-flex h-12 items-center gap-2 rounded-full border border-[#1E4D3A] px-5 text-sm font-semibold text-[#1E4D3A] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C]"><FiBell aria-hidden="true" />Notify in Browser</button>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
