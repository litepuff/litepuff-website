import { motion } from 'framer-motion';
import { FiMinus, FiPlus } from 'react-icons/fi';
import cheeseImage from '../assets/images/products/cheese.png';
import creamOnionImage from '../assets/images/products/cream-onion.png';
import mintImage from '../assets/images/products/mint.png';
import periPeriImage from '../assets/images/products/peri-peri.png';
import saltPepperImage from '../assets/images/products/salt-pepper.png';
import { formatMoney } from '../utils/formatMoney';

const productImages = {
  Cheese: cheeseImage,
  'Cream & Onion': creamOnionImage,
  Mint: mintImage,
  'Peri Peri': periPeriImage,
  'Salt & Pepper': saltPepperImage,
};

function getProductImage(item) {
  if (productImages[item.flavour]) return productImages[item.flavour];
  const name = item.name?.toLowerCase() || '';
  if (name.includes('cream') || name.includes('onion')) return creamOnionImage;
  if (name.includes('cheese')) return cheeseImage;
  if (name.includes('mint') || name.includes('pudina')) return mintImage;
  if (name.includes('salt') || name.includes('pepper')) return saltPepperImage;
  return periPeriImage;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }) {
  const image = getProductImage(item);
  const unitPrice = Number(item.price || 0);
  const mrp = Number(item.originalPrice || item.regularPrice || item.oldPrice || unitPrice);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex gap-3 rounded-[18px] border border-[#E9E2D7] bg-white p-3 shadow-[0_4px_14px_rgba(36,48,41,0.035)]"
    >
      <div className="flex h-[80px] w-[76px] shrink-0 items-center justify-center rounded-[14px] bg-[#F8F5EE]">
        <img src={image} alt={item.name} className="h-16 w-16 object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-[18px] font-semibold leading-5 tracking-[-0.02em] text-[#243029] sm:text-[20px]">{item.name}</h3>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#7A817C]">{item.weight || '70 g'}</p>
          </div>
          <div className="shrink-0 text-right"><p className="text-sm font-semibold text-[#243029]">{formatMoney(unitPrice * item.quantity)}</p>{item.type !== 'combo' && item.quantity > 1 && <p className="text-[10px] text-[#7A817C]">{formatMoney(unitPrice)} × {item.quantity}</p>}</div>
        </div>
        {item.type !== 'combo' && <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]"><span className="text-[#7A817C] line-through">MRP {formatMoney(mrp)}</span><span className="rounded-full bg-[#E8F0EA] px-2 py-0.5 font-black text-[#1E4D3A]">15% OFF</span><strong>{formatMoney(unitPrice)} each</strong></div>}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="grid h-10 grid-cols-3 overflow-hidden rounded-full border border-[#E3DDD2] bg-[#FAF8F3]" aria-label={`Quantity for ${item.name}`}>
            <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="grid h-10 w-10 place-items-center text-[#1F5E3B] transition-colors hover:bg-white" aria-label={`Decrease ${item.name} quantity`}><FiMinus size={14} /></button>
            <span className="grid h-10 w-8 place-items-center text-xs font-semibold" aria-live="polite">{item.quantity}</span>
            <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="grid h-10 w-10 place-items-center text-[#1F5E3B] transition-colors hover:bg-white" aria-label={`Increase ${item.name} quantity`}><FiPlus size={14} /></button>
          </div>
          <button type="button" onClick={() => onRemove(item.id)} className="min-h-11 px-2 text-[11px] font-semibold text-[#7A817C] transition-colors hover:text-[#9A392F]">Remove</button>
        </div>
      </div>
    </motion.article>
  );
}
