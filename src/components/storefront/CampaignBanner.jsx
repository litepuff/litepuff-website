import { motion, useReducedMotion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';
import { useOffers } from '../../hooks/useOffers.js';
import { formatMoney } from '../../utils/formatMoney.js';
import periPeri from '../../assets/images/products/peri-peri.png';
import mint from '../../assets/images/products/mint.png';
import cheese from '../../assets/images/products/cheese.png';
import creamOnion from '../../assets/images/products/cream-onion.png';
import saltPepper from '../../assets/images/products/salt-pepper.png';

const campaignProducts = [
  { image: mint, name: 'Mint Pudina Makhana', position: 'left-[2%] bottom-[6%] h-[55%] -rotate-[5deg]' },
  { image: creamOnion, name: 'Cream & Onion Makhana', position: 'left-[18%] bottom-[8%] h-[66%] -rotate-[2deg]' },
  { image: periPeri, name: 'Peri Peri Makhana', position: 'left-1/2 bottom-[5%] z-10 h-[80%] -translate-x-1/2' },
  { image: cheese, name: 'Cheese Makhana', position: 'right-[18%] bottom-[8%] h-[66%] rotate-[2deg]' },
  { image: saltPepper, name: 'Salt & Pepper Makhana', position: 'right-[2%] bottom-[6%] h-[55%] rotate-[5deg]' },
];

export default function CampaignBanner() {
  const offers = useOffers();
  const reduceMotion = useReducedMotion();
  const openCombo = (comboType) => window.dispatchEvent(new CustomEvent('litepuff:open-combo', { detail: { comboType } }));
  return <section className="bg-[#FBF6EB] px-5 py-16 sm:px-6 md:py-20 lg:px-10" aria-labelledby="festive-campaign-title"><div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.08fr_.92fr] lg:gap-16">
    <motion.div className="relative h-[340px] overflow-hidden rounded-[28px] border border-[#E8E1D4] bg-[#FAF8F3] sm:h-[440px]" initial={reduceMotion ? false : { opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: reduceMotion ? 0 : .6, ease: 'easeOut' }}>
      <div className="absolute -left-[18%] -top-[30%] h-[78%] w-[70%] rounded-[50%] border border-[#9DAF9F]/20 bg-[#DDE5DC]/25" aria-hidden="true" />
      <div className="absolute -bottom-[35%] -right-[18%] h-[72%] w-[68%] rounded-[50%] border border-[#B7C3B5]/20 bg-[#E7ECE5]/35" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,.88),rgba(250,248,243,.2)_52%,rgba(222,230,220,.22)_100%)]" aria-hidden="true" />
      <div className="absolute inset-x-8 top-7 flex items-center gap-3 text-[#D4A017]" aria-hidden="true"><span className="h-px flex-1 bg-current/40" /><span>✦</span><span className="h-px flex-1 bg-current/40" /></div><div className="absolute bottom-3 left-[9%] right-[9%] h-10 rounded-[50%] bg-black/25 blur-xl" />
      {campaignProducts.map((product) => <img key={product.name} src={product.image} alt={`${product.name} LitePuff jar`} className={`absolute w-auto object-contain drop-shadow-2xl ${product.position}`} loading="lazy" />)}
    </motion.div>
    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: reduceMotion ? 0 : .55, ease: 'easeOut' }}><p className="text-xs font-bold uppercase tracking-[.28em] text-[#A97826]">The Festive Edit</p><h2 id="festive-campaign-title" className="mt-3 font-display text-[44px] font-semibold leading-[.95] tracking-[-.035em] text-[#243029] sm:text-5xl lg:text-6xl">More Crunch.<br />More to Share.</h2><p className="mt-5 max-w-lg text-base leading-7 text-[#626862]">Pick your favourites, mix your flavours and make snack time more rewarding.</p><div className="mt-9 grid gap-5 sm:grid-cols-2">{offers.combo2.enabled && <OfferChoice label="Buy 2" offer={offers.combo2} onClick={() => openCombo('COMBO_2')} delay={0} reduceMotion={reduceMotion} />}{offers.combo3.enabled && <OfferChoice label="Buy 3" offer={offers.combo3} onClick={() => openCombo('COMBO_3')} delay={.08} reduceMotion={reduceMotion} />}</div></motion.div>
  </div></section>;
}

function OfferChoice({ label, offer, onClick, delay, reduceMotion }) { return <motion.article className="border-y border-[#CDBF9F] py-5" initial={reduceMotion ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: reduceMotion ? 0 : .4, delay }}><p className="text-xs font-bold uppercase tracking-[.2em] text-[#174F3D]">{label}</p><p className="mt-2 font-display text-[42px] font-semibold leading-none text-[#243029]">{formatMoney(offer.price)}</p>{offer.freeDelivery && <p className="mt-2 text-[11px] font-bold uppercase tracking-[.15em] text-[#A97826]">Free Delivery</p>}<button type="button" onClick={onClick} className="group mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#174F3D]">Build Your Combo <FiArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></button></motion.article>; }
