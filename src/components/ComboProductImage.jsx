import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { getProductImage } from '../utils/productImage.js';

function expandProducts(products = []) {
  return products.flatMap((product) => Array.from({ length: Math.max(1, Number(product.quantity || 1)) }, (_, index) => ({ ...product, instanceKey: `${product.productId || product.id}-${index}` })));
}

export default function ComboProductImage({ selectedProducts = [], comboSize = 2, className = '', imageClassName = '' }) {
  const reduceMotion = useReducedMotion();
  const products = expandProducts(selectedProducts).slice(0, comboSize);
  return <div className={`relative isolate overflow-hidden bg-[#F6F0E5] ${className}`} aria-label={products.length ? `Combo containing ${products.map((item) => item.name || item.productName).join(', ')}` : 'Empty combo preview'}>
    <span className="absolute -left-12 top-8 h-40 w-40 rounded-full bg-[#DDE7D8]/65 blur-2xl" aria-hidden="true" />
    <span className="absolute -bottom-16 right-0 h-48 w-48 rounded-full bg-[#EAD9B4]/55 blur-3xl" aria-hidden="true" />
    <AnimatePresence mode="popLayout" initial={false}>{products.map((product, index) => {
      const count = products.length;
      const positions = count === 1 ? ['left-1/2 -translate-x-1/2'] : count === 2 ? ['left-[18%]', 'right-[18%]'] : ['left-[8%]', 'left-1/2 -translate-x-1/2 z-10', 'right-[8%]'];
      const sizes = count === 1 ? 'h-[82%] w-[62%]' : count === 2 ? 'h-[76%] w-[48%]' : index === 1 ? 'h-[80%] w-[43%]' : 'h-[70%] w-[38%]';
      return <motion.img key={product.instanceKey} src={getProductImage(product)} alt={`${product.name || product.productName} LitePuff jar`} className={`absolute bottom-[7%] object-contain drop-shadow-[0_16px_16px_rgba(36,48,41,.16)] ${positions[index]} ${sizes} ${imageClassName}`} initial={reduceMotion ? false : { opacity: 0, y: 18, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: .97 }} transition={{ duration: reduceMotion ? 0 : .25, ease: 'easeOut' }} />;
    })}</AnimatePresence>
    {!products.length && <div className="absolute inset-0 grid place-items-center p-6 text-center"><div><p className="font-display text-2xl font-semibold text-[#35453C]">Your box starts here.</p><p className="mt-2 text-xs text-[#6C756F]">Choose flavours to build the preview.</p></div></div>}
  </div>;
}
