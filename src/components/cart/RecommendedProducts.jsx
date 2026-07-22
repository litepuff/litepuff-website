import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import cheeseImage from '../../assets/images/products/cheese.png';
import creamOnionImage from '../../assets/images/products/cream-onion.png';
import mintImage from '../../assets/images/products/mint.png';
import periPeriImage from '../../assets/images/products/peri-peri.png';
import saltPepperImage from '../../assets/images/products/salt-pepper.png';
import { fallbackProducts } from '../../utils/siteConfig';
import { formatMoney } from '../../utils/formatMoney';

const images = { Cheese: cheeseImage, 'Cream & Onion': creamOnionImage, Mint: mintImage, 'Peri Peri': periPeriImage, 'Salt & Pepper': saltPepperImage };

export default function RecommendedProducts() {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C89B3C]">Complete your selection</p>
      <h2 className="mt-2 font-display text-[38px] font-semibold leading-none tracking-[-0.03em] text-[#243029]">You May Also Like</h2>
      <div className="mt-7 grid gap-6 md:grid-cols-3">
        {fallbackProducts.slice(0, 3).map((product) => (
          <motion.article key={product.id} whileHover={{ y: -6 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="group rounded-3xl border border-[#ECE7DD] bg-white p-5 shadow-[0_10px_30px_rgba(36,48,41,0.04)]">
            <Link to={`/products/${product.slug}`} className="block">
              <div className="mx-auto flex aspect-square max-w-[260px] items-center justify-center rounded-[20px] bg-[#FAF8F2]">
                <img src={images[product.flavour]} alt={product.name} className="h-[220px] w-[220px] object-contain transition-transform duration-[350ms] group-hover:scale-[1.03]" />
              </div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C89B3C]">{product.category}</p>
              <h3 className="mt-2 font-display text-[27px] font-semibold leading-none text-[#243029]">{product.name}</h3>
              <div className="mt-4 flex items-center justify-between gap-4 text-sm"><strong>{formatMoney(product.price)}</strong><span className="font-semibold text-[#1E4D3A]">View Product &rarr;</span></div>
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
