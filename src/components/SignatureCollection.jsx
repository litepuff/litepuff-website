import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheck, FiHeart, FiShoppingBag, FiStar } from 'react-icons/fi';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatMoney } from '../utils/formatMoney.js';
import periPeriImage from '../assets/images/products/peri-peri.png';
import mintImage from '../assets/images/products/mint.png';
import cheeseImage from '../assets/images/products/cheese.png';
import creamOnionImage from '../assets/images/products/cream-onion.png';
import saltPepperImage from '../assets/images/products/salt-pepper.png';

const products = [
  {
    id: 'peri-peri-makhana', slug: 'peri-peri-makhana', name: 'Peri Peri Makhana',
    description: 'Smoky chilli and tangy spice with a bold, lingering finish.',
    price: 224, weight: '70gm', rating: '4.8', reviews: 128, badge: 'Best Seller',
    tags: ['Spicy', 'Tangy'], image: periPeriImage,
  },
  {
    id: 'mint-pudina-makhana', slug: 'mint-pudina-makhana', name: 'Mint Pudina Makhana',
    description: 'Fresh pudina seasoning with a clean, cooling crunch.',
    price: 224, weight: '70gm', rating: '4.7', reviews: 116, badge: 'Healthy Choice',
    tags: ['Minty', 'Zesty'], image: mintImage,
  },
  {
    id: 'cheese-makhana', slug: 'cheese-makhana', name: 'Cheese Makhana',
    description: 'Rich, savoury cheese flavour with a satisfyingly light bite.',
    price: 224, weight: '70gm', rating: '4.9', reviews: 142, badge: 'Top Rated',
    tags: ['Cheesy', 'Creamy'], image: cheeseImage,
  },
  {
    id: 'cream-onion-makhana', slug: 'cream-onion-makhana', name: 'Cream & Onion Makhana',
    description: 'Smooth cream and savoury onion, balanced in every handful.',
    price: 224, weight: '70gm', rating: '4.8', reviews: 124, badge: 'Most Loved',
    tags: ['Creamy', 'Savoury'], image: creamOnionImage,
  },
  {
    id: 'salt-pepper-makhana', slug: 'salt-pepper-makhana', name: 'Salt & Pepper Makhana',
    description: 'Rock salt and cracked pepper for a timeless, crisp finish.',
    price: 224, weight: '70gm', rating: '4.7', reviews: 108, badge: 'Classic',
    tags: ['Crunchy', 'Peppery'], image: saltPepperImage,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const productGrid = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055 } },
};

const ProductCard = memo(function ProductCard({ product, onAdd }) {
  const [buttonState, setButtonState] = useState('idle');
  const [isWished, setIsWished] = useState(false);

  const addProduct = () => {
    if (buttonState !== 'idle') return;
    setButtonState('adding');
    window.setTimeout(() => {
      onAdd(product);
      setButtonState('added');
      window.setTimeout(() => setButtonState('idle'), 1400);
    }, 350);
  };

  return (
    <motion.article
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[28px] border border-[#E7E1D7] bg-[#FAF8F2] p-4 shadow-[0_8px_24px_rgba(36,48,41,0.05)] transition-[box-shadow,border-color] duration-300 hover:border-[#D7CEBF] hover:shadow-[0_16px_34px_rgba(36,48,41,0.10)] sm:p-5"
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="relative flex h-[240px] items-center justify-center sm:h-[260px] md:h-[230px] lg:h-[220px] xl:h-[240px]">
        <motion.span className="absolute left-0 top-0 z-10 rounded-full bg-[#1E4D3A] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white" whileHover={{ opacity: 0.88 }}>
          {product.badge}
        </motion.span>
        <button type="button" onClick={() => setIsWished((value) => !value)} className="absolute right-0 top-0 z-10 grid h-9 w-9 place-items-center rounded-full bg-white text-[#1E4D3A] transition-transform duration-300 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C]" aria-label={`${isWished ? 'Remove' : 'Add'} ${product.name} ${isWished ? 'from' : 'to'} wishlist`} aria-pressed={isWished}>
          <FiHeart className={isWished ? 'fill-[#C89B3C] text-[#C89B3C]' : ''} aria-hidden="true" />
        </button>
        <motion.img src={product.image} alt={`${product.name} LitePuff jar`} className="h-full w-full object-contain py-2" loading="lazy" decoding="async" whileHover={{ scale: 1.04, y: -3 }} transition={{ duration: 0.3, ease: 'easeOut' }} />
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <h3 className="font-display text-[25px] font-semibold leading-[1.05] tracking-[-0.025em] text-[#243029] transition-colors duration-300 group-hover:text-[#1E4D3A]">{product.name}</h3>
        <p className="mt-2 min-h-[44px] text-[13px] leading-[1.6] text-[#5F6762]">{product.description}</p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div><p className="text-lg font-bold text-[#243029]">{formatMoney(product.price)}</p><p className="text-xs font-medium text-[#68706B]">{product.weight}</p></div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E4D3A]"><span className="h-2 w-2 rounded-full bg-[#4D9B62]" aria-hidden="true" />In Stock</span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs" aria-label={`${product.rating} out of 5 stars from ${product.reviews} customer reviews`}>
          <span className="flex text-[#C89B3C]" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <FiStar key={index} size={13} className="fill-current" />)}</span>
          <span className="font-semibold text-[#243029]">{product.rating}</span>
          <span className="text-[#777D79]">({product.reviews})</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">{product.tags.map((tag) => <span key={tag} className="rounded-full border border-[#D9D2C6] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5B625E]">{tag}</span>)}</div>

        <div className="mt-auto grid gap-2 pt-5">
          <button type="button" onClick={addProduct} disabled={buttonState !== 'idle'} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1E4D3A] px-4 text-sm font-semibold text-white transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-[#2C614A] hover:shadow-[0_8px_18px_rgba(30,77,58,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#C89B3C] disabled:cursor-default">
            {buttonState === 'added' ? <FiCheck aria-hidden="true" /> : <FiShoppingBag aria-hidden="true" />}
            {buttonState === 'adding' ? 'Adding...' : buttonState === 'added' ? 'Added ✓' : 'Add to Cart'}
          </button>
          <Link to={`/products/${product.slug}`} className="inline-flex h-11 w-full items-center justify-center rounded-full border border-[#1E4D3A] text-sm font-semibold text-[#1E4D3A] transition-[transform,background-color,color] duration-300 hover:-translate-y-0.5 hover:bg-[#1E4D3A] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#C89B3C]" aria-label={`Quick view ${product.name}`}>Quick View</Link>
        </div>
      </div>
    </motion.article>
  );
});

export default function SignatureCollection() {
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const handleAdd = (product) => {
    addToCart({ ...product, images: [product.image] });
    showToast(`${product.name} added to cart.`);
  };

  return (
    <section className="bg-white py-12 md:py-16 lg:py-20" aria-labelledby="signature-collection-title">
      <div className="mx-auto max-w-[1500px] px-5 sm:px-6 lg:px-8">
        <motion.header className="mx-auto max-w-[720px] text-center" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp}>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C89B3C]">Featured Products</p>
          <h2 id="signature-collection-title" className="mt-3 font-display text-[38px] font-semibold leading-none tracking-[-0.04em] text-[#243029] md:text-[48px]">Shop Our Signature Collection</h2>
          <p className="mx-auto mt-4 max-w-[620px] text-base leading-7 text-[#5F6762] md:text-lg">Five thoughtfully crafted roasted makhana flavours made with premium ingredients and bold seasonings for healthier everyday snacking.</p>
        </motion.header>

        <motion.div className="mt-9 grid grid-cols-1 gap-5 md:grid-cols-3 lg:grid-cols-5 lg:gap-4 xl:gap-5" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.08 }} variants={productGrid}>
          {products.map((product) => <ProductCard key={product.id} product={product} onAdd={handleAdd} />)}
        </motion.div>
      </div>
    </section>
  );
}
