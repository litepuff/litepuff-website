import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiHeart, FiMinus, FiPlus, FiTrash2 } from 'react-icons/fi';
import cheeseImage from '../../assets/images/products/cheese.png';
import creamOnionImage from '../../assets/images/products/cream-onion.png';
import mintImage from '../../assets/images/products/mint.png';
import periPeriImage from '../../assets/images/products/peri-peri.png';
import saltPepperImage from '../../assets/images/products/salt-pepper.png';
import { formatMoney } from '../../utils/formatMoney';

const productImages = {
  Cheese: cheeseImage,
  'Cream & Onion': creamOnionImage,
  Mint: mintImage,
  'Peri Peri': periPeriImage,
  'Salt & Pepper': saltPepperImage,
};

function imageFor(item) {
  if (productImages[item.flavour]) return productImages[item.flavour];
  const name = item.name?.toLowerCase() || '';
  if (name.includes('cream') || name.includes('onion')) return creamOnionImage;
  if (name.includes('cheese')) return cheeseImage;
  if (name.includes('mint') || name.includes('pudina')) return mintImage;
  if (name.includes('salt') || name.includes('pepper')) return saltPepperImage;
  return periPeriImage;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }) {
  const [isWishlisted, setIsWishlisted] = useState(false);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-[28px] border border-[#ECE7DD] bg-white p-5 shadow-[0_12px_36px_rgba(36,48,41,0.045)] sm:p-7 lg:p-8"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-3xl border border-[#ECE7DD] bg-white">
          <img src={imageFor(item)} alt={item.name} className="h-24 w-24 object-contain" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C89B3C]">{item.category || 'LitePuff'} Collection</p>
          <h2 className="mt-2 font-display text-[30px] font-semibold leading-none tracking-[-0.03em] text-[#243029]">{item.name}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold text-[#243029]">{formatMoney(item.price)}</span>
            <span className="h-1 w-1 rounded-full bg-[#C89B3C]" aria-hidden="true" />
            <span className="text-[#6B726D]">{item.weight || '70 g'}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Roasted', 'Never Fried', 'Premium Ingredients'].map((feature) => (
              <span key={feature} className="rounded-full border border-[#ECE7DD] bg-[#FAF8F2] px-3 py-1.5 text-[10px] font-medium text-[#4E5550]">{feature}</span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-5 border-t border-[#ECE7DD] pt-5 sm:block sm:border-0 sm:pt-0">
          <div className="grid h-[42px] grid-cols-3 overflow-hidden rounded-full border border-[#ECE7DD] bg-[#FAF8F2]" aria-label={`Quantity for ${item.name}`}>
            <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="grid h-[42px] w-10 place-items-center text-[#1E4D3A] transition-colors hover:bg-white" aria-label={`Decrease ${item.name} quantity`}><FiMinus size={15} /></button>
            <span className="grid h-[42px] w-9 place-items-center text-sm font-semibold" aria-live="polite">{item.quantity}</span>
            <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="grid h-[42px] w-10 place-items-center text-[#1E4D3A] transition-colors hover:bg-white" aria-label={`Increase ${item.name} quantity`}><FiPlus size={15} /></button>
          </div>
          <div className="flex items-center gap-4 sm:mt-5 sm:justify-center">
            <button type="button" onClick={() => setIsWishlisted(!isWishlisted)} className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${isWishlisted ? 'text-[#1E4D3A]' : 'text-[#7A817C] hover:text-[#1E4D3A]'}`} aria-pressed={isWishlisted}><FiHeart size={14} className={isWishlisted ? 'fill-current' : ''} /> Wishlist</button>
            <button type="button" onClick={() => onRemove(item.id)} className="flex items-center gap-1.5 text-xs font-medium text-[#7A817C] transition-colors hover:text-[#A43B2B]"><FiTrash2 size={14} /> Remove</button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
