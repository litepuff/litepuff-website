import { useEffect, useMemo, useRef, useState } from 'react';
import { FiCheck, FiMinus, FiPlus, FiX } from 'react-icons/fi';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { comboAssets } from '../../config/comboAssets.js';
import { useCart } from '../../context/CartContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useOffers } from '../../hooks/useOffers.js';
import { formatMoney } from '../../utils/formatMoney.js';

function OfferCard({ badge, title, price, detail, action, featured = false }) {
  return <article className={`relative rounded-[28px] border bg-white p-6 ${featured ? 'border-[#C9A227] shadow-[0_14px_36px_rgba(36,48,41,.08)]' : 'border-[#E7E1D7]'}`}>
    {badge && <span className="absolute right-5 top-5 rounded-full bg-[#1F5E3B] px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-white">{badge}</span>}
    <p className="text-xs font-bold uppercase tracking-[.22em] text-[#C89B3C]">LitePuff Offer</p>
    <h3 className="mt-4 font-display text-3xl font-semibold text-[#243029]">{title}</h3>
    <p className="mt-3 text-3xl font-bold text-[#1F5E3B]">{price}</p>
    <p className="mt-2 min-h-12 text-sm leading-6 text-[#65706A]">{detail}</p>
    <button type="button" onClick={action} className="mt-5 h-12 w-full rounded-full bg-[#1F5E3B] text-sm font-bold text-white">{title === 'Any 1 Product' ? 'Shop Single' : 'Build Combo'}</button>
  </article>;
}

export default function OfferSection({ products = [], compact = false, showCards = true }) {
  const offers = useOffers();
  const navigate = useNavigate();
  const { addComboToCart } = useCart();
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();
  const [builder, setBuilder] = useState(null);
  const dialogRef = useRef(null);
  const [selected, setSelected] = useState({});
  const available = useMemo(() => products.filter((product) => String(product.status || 'active').toLowerCase() === 'active' && Number(product.stock || 0) > 0), [products]);
  const offer = builder ? offers[builder === 'COMBO_2' ? 'combo2' : 'combo3'] : null;
  const selectedCount = Object.values(selected).reduce((sum, value) => sum + value, 0);
  const change = (id, delta) => setSelected((current) => {
    const next = Math.max(0, (current[id] || 0) + delta);
    if (delta > 0 && selectedCount >= offer.requiredItems) return current;
    return { ...current, [id]: next };
  });
  const open = (comboType) => { setBuilder(comboType); setSelected({}); };
  useEffect(() => {
    const listener = (event) => open(event.detail?.comboType === 'COMBO_3' ? 'COMBO_3' : 'COMBO_2');
    window.addEventListener('litepuff:open-combo', listener);
    return () => window.removeEventListener('litepuff:open-combo', listener);
  }, []);
  useEffect(() => {
    if (!builder) return undefined;
    dialogRef.current?.focus();
    const close = (event) => event.key === 'Escape' && setBuilder(null);
    document.addEventListener('keydown', close); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', close); document.body.style.overflow = ''; };
  }, [builder]);
  const add = () => {
    if (selectedCount !== offer.requiredItems) return;
    const items = Object.entries(selected).filter(([, quantity]) => quantity > 0).map(([productId, quantity]) => {
      const product = available.find((item) => item.id === productId);
      return { productId, id: productId, quantity, name: product?.name, productName: product?.name, metaCatalogId: product?.metaCatalogId, price: product?.price, image: product?.image };
    });
    addComboToCart({ comboType: builder, name: `LitePuff ${offer.requiredItems}-Product Combo`, items, price: offer.price, freeDelivery: offer.freeDelivery });
    setBuilder(null);
    showToast(`${offer.requiredItems}-product combo added to your bag.`);
  };

  return <section className={showCards ? (compact ? 'py-6' : 'px-5 py-10 md:px-8 md:py-14') : ''} aria-labelledby={showCards ? 'offers-title' : undefined}>
    {showCards && <div className="mx-auto max-w-7xl"><div className="mb-7 text-center"><p className="text-xs font-bold uppercase tracking-[.28em] text-[#C89B3C]">LitePuff Offers</p><h2 id="offers-title" className="mt-3 font-display text-4xl font-semibold text-[#243029] md:text-5xl">Choose Your Perfect Snack Bundle</h2><p className="mt-3 text-[#65706A]">More flavours. Better value.</p></div>
    <div className="grid gap-5 md:grid-cols-3">
      <OfferCard title="Any 1 Product" price={`${offers.singleDiscountPercent}% OFF`} detail="Choose your favourite flavour. Discount calculated from its current MRP." action={() => { const products = document.getElementById('products-title') || document.getElementById('signature-collection-title'); products ? products.scrollIntoView({ behavior: 'smooth' }) : navigate('/products'); }} />
      {offers.combo2.enabled && <OfferCard badge="Most Popular" title="Any 2 Products" price={formatMoney(offers.combo2.price)} detail="Customize any two flavours. Free delivery included." featured action={() => open('COMBO_2')} />}
      {offers.combo3.enabled && <OfferCard badge="Best Value" title="Any 3 Products" price={formatMoney(offers.combo3.price)} detail="Customize any three flavours. Free delivery included." action={() => open('COMBO_3')} />}
    </div></div>}
    <AnimatePresence>{builder && <motion.div className="fixed inset-0 z-[120] grid place-items-end bg-[#14251D]/45 backdrop-blur-[2px] md:place-items-center md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .18 }} onMouseDown={(event) => event.target === event.currentTarget && setBuilder(null)}>
      <motion.div ref={dialogRef} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="combo-builder-title" className="flex max-h-[94svh] w-full flex-col overflow-hidden rounded-t-[26px] bg-[#FAF8F2] outline-none md:max-h-[86vh] md:max-w-[820px] md:rounded-[26px]" initial={reduceMotion ? false : { opacity: 0, y: 28, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: .99 }} transition={{ duration: reduceMotion ? 0 : .22, ease: 'easeOut' }}>
        <header className="grid grid-cols-[72px_1fr_auto] items-center gap-3 border-b border-[#E7E1D7] bg-white px-4 py-3 sm:grid-cols-[88px_1fr_auto] sm:px-5">
          <div className="h-[62px] overflow-hidden rounded-[14px] bg-[#F4EBD9] p-1"><img src={comboAssets[builder]} alt="" className="h-full w-full object-contain" /></div>
          <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#A76525]">BUY {offer.requiredItems} · {formatMoney(offer.price)}</p><h2 id="combo-builder-title" className="mt-1 font-display text-[24px] font-semibold leading-none text-[#243029] sm:text-[30px]">Build Your {offer.requiredItems}-Product Combo</h2><p className="mt-1 hidden text-xs text-[#65706A] sm:block">Choose your flavours. Duplicate flavours are welcome.</p></div>
          <button type="button" onClick={() => setBuilder(null)} className="grid h-10 w-10 place-items-center rounded-full bg-[#F3EFE6] text-[#243029] transition hover:bg-[#E9E2D7]" aria-label="Close combo builder"><FiX /></button>
        </header>
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3 sm:px-5">
          <p className="text-sm font-bold text-[#1F5E3B]">Selected: {selectedCount} / {offer.requiredItems}</p>
          <div className="flex gap-1" aria-hidden="true">{Array.from({ length: offer.requiredItems }, (_, index) => <span key={index} className={`h-1.5 w-7 rounded-full transition-colors duration-200 ${index < selectedCount ? 'bg-[#1F5E3B]' : 'bg-[#DDD7CC]'}`} />)}</div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{available.map((product) => {
            const quantity = selected[product.id] || 0;
            return <motion.article layout={!reduceMotion} key={product.id} className={`relative flex min-w-0 flex-col rounded-[18px] border bg-white p-2.5 transition-colors duration-200 ${quantity > 0 ? 'border-[#1F5E3B] shadow-[0_6px_18px_rgba(30,77,58,.09)]' : 'border-[#E7E1D7]'}`}>
              {quantity > 0 && <span className="absolute right-2 top-2 z-10 grid h-6 min-w-6 place-items-center rounded-full bg-[#1F5E3B] px-1 text-[11px] font-black text-white">{quantity}</span>}
              <div className="aspect-square overflow-hidden rounded-[13px] bg-[#FAF8F2] p-2"><img src={product.image || product.primaryImage} alt={product.name} className="h-full w-full object-contain transition duration-200 hover:scale-[1.03]" /></div>
              <h3 className="mt-2 truncate text-sm font-bold text-[#243029]">{product.name}</h3><p className="truncate text-[11px] text-[#65706A]">{product.flavour || product.flavor || product.category}</p>
              <div className="mt-2 flex h-9 items-center justify-between rounded-full border border-[#DDD5C8] bg-[#FAF8F2]">
                <button type="button" disabled={!quantity} className="grid h-9 w-9 place-items-center rounded-full text-[#1F5E3B] disabled:text-[#B9B4AA]" onClick={() => change(product.id, -1)} aria-label={`Remove ${product.name}`}><FiMinus /></button><span className="w-5 text-center text-sm font-black">{quantity}</span><button type="button" disabled={selectedCount >= offer.requiredItems} className="grid h-9 w-9 place-items-center rounded-full text-[#1F5E3B] disabled:text-[#B9B4AA]" onClick={() => change(product.id, 1)} aria-label={`Add ${product.name}`}><FiPlus /></button>
              </div>
            </motion.article>;
          })}</div>
        </div>
        <footer className="border-t border-[#E7E1D7] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:flex sm:items-center sm:gap-4 sm:px-5 sm:pb-4">
          <div className="flex items-center justify-between sm:min-w-[190px] sm:block"><strong className="font-display text-2xl font-semibold text-[#243029]">{formatMoney(offer.price)}</strong><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#1F5E3B]"><FiCheck className="mr-1 inline" />Free delivery</p></div>
          <div className="mt-2 flex-1 sm:mt-0"><button type="button" disabled={selectedCount !== offer.requiredItems} onClick={add} className="h-12 w-full rounded-full bg-[#1F5E3B] px-7 text-sm font-bold text-white transition duration-200 hover:bg-[#174A2F] disabled:cursor-not-allowed disabled:bg-[#C9C6BE]">Add to Bag</button>{selectedCount !== offer.requiredItems && <p className="mt-1.5 text-center text-[11px] text-[#7B6E61]">Choose {offer.requiredItems - selectedCount} more {offer.requiredItems - selectedCount === 1 ? 'flavour' : 'flavours'} to continue.</p>}</div>
        </footer>
      </motion.div>
    </motion.div>}</AnimatePresence>
  </section>;
}
