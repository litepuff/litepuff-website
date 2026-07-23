import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiHeart } from 'react-icons/fi';
import { Link, useParams } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import OnlinePaymentOffer from '../components/OnlinePaymentOffer.jsx';
import { useCart } from '../context/CartContext.jsx';
import { productLabelData } from '../data/productLabelData.js';
import cheeseImage from '../assets/images/products/cheese.png';
import creamOnionImage from '../assets/images/products/cream-onion.png';
import mintImage from '../assets/images/products/mint.png';
import periPeriImage from '../assets/images/products/peri-peri.png';
import saltPepperImage from '../assets/images/products/salt-pepper.png';
import { getProductBySlug, getProducts } from '../services/productService';
import { formatMoney } from '../utils/formatMoney';
import { customerService } from '../services/customerService';
import { useToast } from '../context/ToastContext';
import { contentService } from '../services/contentService';
import { useCustomerAuth } from '../context/CustomerAuthContext';

const productImages = {
  Cheese: cheeseImage,
  'Cream & Onion': creamOnionImage,
  Mint: mintImage,
  'Peri Peri': periPeriImage,
  'Salt & Pepper': saltPepperImage,
};

const highlights = [
  'Roasted',
  'Never Fried',
  'Source of Fibre',
  'Premium Ingredients',
  'High Protein',
  'No Cholesterol',
];

const reveal = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12 },
  transition: { duration: 0.4, ease: 'easeOut' },
};

const sectionHeading = 'font-display text-[34px] font-semibold leading-none tracking-[-0.04em] md:text-[40px] lg:text-[52px]';
const infoHeading = 'font-display text-[36px] font-semibold leading-none tracking-[-0.035em] text-[#243029] lg:text-[42px]';

// Sticky product presentation. Product photography is intentionally ignored.
function ProductShowcase({ product }) {
  const image = productImages[product.flavour];

  return (
    <div className="mx-auto w-full max-w-[480px] md:sticky md:top-24">
      <div className="group flex h-[420px] items-center justify-center overflow-hidden rounded-[32px] border border-[#ECE7DD] bg-white shadow-[0_16px_50px_rgba(36,48,41,0.055)] sm:h-[500px] lg:h-[560px]">
        <motion.img
          key={product.flavour}
          src={image}
          alt={product.name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="h-[300px] w-[300px] object-contain transition-transform duration-[400ms] group-hover:scale-[1.03] sm:h-[340px] sm:w-[340px] lg:h-[360px] lg:w-[360px]"
        />
      </div>

      <div className="mt-3 flex justify-center gap-3" aria-label="Product thumbnails">
        <button
          type="button"
          aria-label={`Selected view of ${product.name}`}
          aria-pressed="true"
          className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-2 border-[#1E4D3A] bg-white transition-colors duration-[400ms] hover:border-[#1E4D3A]"
        >
          <img src={image} alt="" className="h-14 w-14 object-contain" />
        </button>
      </div>
    </div>
  );
}

function QuantitySelector({ quantity, setQuantity }) {
  return (
    <div
      className="overflow-hidden rounded-full border border-[#ECE7DD] bg-white"
      style={{ display: 'grid', width: 144, height: 48, gridTemplateColumns: '48px 48px 48px' }}
      aria-label="Quantity selector"
    >
      <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-12 w-12 items-center justify-center text-xl font-light leading-none text-[#1E4D3A] transition-colors duration-300 hover:bg-[#FAF8F2]" aria-label="Decrease quantity"><span aria-hidden="true" className="block -translate-y-px">&minus;</span></button>
      <span className="flex h-12 w-12 items-center justify-center text-sm font-semibold leading-none" aria-live="polite">{quantity}</span>
      <button type="button" onClick={() => setQuantity(quantity + 1)} className="flex h-12 w-12 items-center justify-center text-xl font-light leading-none text-[#1E4D3A] transition-colors duration-300 hover:bg-[#FAF8F2]" aria-label="Increase quantity"><span aria-hidden="true" className="block -translate-y-px">+</span></button>
    </div>
  );
}

// Compact primary product actions.
function ProductActions({ product, quantity, wishlisted, onToggleWishlist, addToCart }) {
  const buttonBase = 'flex h-12 w-[220px] items-center justify-center rounded-full px-6 text-sm font-semibold transition-all duration-[400ms]';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <motion.button
        type="button"
        onClick={() => addToCart(product, quantity)}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className={`${buttonBase} bg-[#1E4D3A] text-white hover:bg-[#2C614A]`}
      >
        Add To Cart
      </motion.button>
      <Link
        to="/cart"
        onClick={() => addToCart(product, quantity)}
        className={`${buttonBase} border border-[#1E4D3A] text-[#1E4D3A] hover:-translate-y-0.5 hover:bg-[#1E4D3A] hover:text-white`}
      >
        Buy Now
      </Link>
      <motion.button
        type="button"
        onClick={onToggleWishlist}
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={wishlisted}
        title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border leading-none transition-colors duration-[400ms] [&>svg]:block [&>svg]:shrink-0 ${wishlisted ? 'border-[#1E4D3A] bg-[#E8F0EA] text-[#1E4D3A]' : 'border-[#ECE7DD] bg-white hover:border-[#1E4D3A]'}`}
      >
        <FiHeart size={19} strokeWidth={1.8} className={wishlisted ? 'fill-current' : ''} />
      </motion.button>
    </div>
  );
}

// Shared editorial shell keeps all information cards visually consistent.
function InformationCard({ children, className = '' }) {
  return (
    <motion.article
      {...reveal}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`h-full rounded-[28px] border border-[#ECE7DD] bg-white p-6 shadow-[0_12px_36px_rgba(36,48,41,0.045)] sm:p-9 ${className}`}
    >
      {children}
    </motion.article>
  );
}

function CardLabel({ children }) {
  return <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#C89B3C]">{children}</p>;
}

// PDF-backed ingredients panel.
function IngredientsCard({ label }) {
  return (
    <InformationCard className="flex flex-col">
      <CardLabel>Composition</CardLabel>
      <h2 className={infoHeading}>Ingredients</h2>
      <p className="mt-5 max-w-[620px] text-base leading-[1.8] text-[#4E5550]">{label.ingredients}</p>

      <div className="mt-5 border-t border-[#ECE7DD] pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A817C]">Allergen Declaration</p>
        <p className="mt-2 text-base leading-[1.8] text-[#4E5550]">{label.allergen}</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-5 border-t border-[#ECE7DD] pt-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A817C]">Serving Size</p>
          <p className="mt-2 text-base font-semibold text-[#243029]">{label.servingSize}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A817C]">Servings Per Pack</p>
          <p className="mt-2 text-base font-semibold text-[#243029]">{label.servingsPerPack}</p>
        </div>
      </div>
    </InformationCard>
  );
}

// Accessible nutrition table with comfortable editorial row spacing.
function NutritionTable({ label }) {
  return (
    <InformationCard>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <CardLabel>Per serving</CardLabel>
          <h2 className={infoHeading}>Nutrition Facts</h2>
        </div>
        <p className="pb-1 text-sm leading-5 text-[#7A817C]">Approximate values per serving</p>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-[#ECE7DD]">
        <table className="w-full border-collapse text-left text-sm" style={{ minWidth: 560 }}>
          <thead>
            <tr className="h-12 border-b border-[#ECE7DD] bg-[#FAF8F2] text-xs uppercase tracking-[0.08em] text-[#4E5550]">
              <th className="px-4 font-bold">Nutrient</th>
              <th className="px-3 text-right font-bold">Per 100 g</th>
              <th className="px-3 text-right font-bold">Per Serving</th>
              <th className="px-4 text-right font-bold">% RDA</th>
            </tr>
          </thead>
          <tbody>
            {label.nutrition.map((item) => (
              <tr key={item.nutrient} className="h-12 border-b border-[#ECE7DD] odd:bg-white even:bg-[#FCFBF7] last:border-0">
                <th scope="row" className="px-4 font-medium text-[#243029]">{item.nutrient}</th>
                <td className="px-3 text-right tabular-nums text-[#4E5550]">{item.per100g}</td>
                <td className="px-3 text-right tabular-nums text-[#4E5550]">{item.perServing}</td>
                <td className="px-4 text-right font-medium tabular-nums text-[#1E4D3A]">{item.rda}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InformationCard>
  );
}

function ChecklistCard({ label, title, items }) {
  return (
    <InformationCard>
      <CardLabel>{label}</CardLabel>
      <h2 className={infoHeading}>{title}</h2>
      <ul className="mt-6 space-y-4">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-base leading-[1.8] text-[#4E5550]">
            <span className="mt-1.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#E8F0EA] text-[#1E4D3A]" aria-hidden="true">
              <FiCheck size={12} strokeWidth={2.5} />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </InformationCard>
  );
}

function ProductInformationGrid({ label }) {
  return (
    <section className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:gap-8" aria-label="Product information">
      <IngredientsCard label={label} />
      <NutritionTable label={label} />
      <ChecklistCard
        label="Product care"
        title="Storage"
        items={['Store in a cool, dry place.', 'Reseal after opening.', 'Keep away from direct sunlight.']}
      />
      <ChecklistCard
        label="Delivery"
        title="Shipping"
        items={['Ships within 24–48 hours.', 'Pan India Delivery.', 'Secure Packaging.']}
      />
    </section>
  );
}

// Related products use only the optimized transparent product PNGs.
function RecommendationCard({ product }) {
  const image = productImages[product.flavour];

  return (
    <motion.article
      whileHover={{ y: -6, boxShadow: '0 18px 42px rgba(36, 48, 41, 0.09)' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="group w-full max-w-[340px] rounded-3xl border border-[#ECE7DD] bg-white p-5 shadow-[0_8px_26px_rgba(36,48,41,0.035)]"
    >
      <Link to={`/products/${product.slug}`} className="block">
        <div className="mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center overflow-hidden rounded-[20px] bg-[#FAF8F2]">
          <img src={image} alt={product.name} className="h-[200px] w-[200px] object-contain transition-transform duration-[400ms] group-hover:scale-[1.03] sm:h-[220px] sm:w-[220px]" />
        </div>
        <div className="pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C89B3C]">{product.category}</p>
          <h3 className="mt-2 font-display text-[28px] font-semibold leading-none tracking-[-0.03em]">{product.name}</h3>
          <p className="mt-3 text-sm font-semibold">{formatMoney(product.price)}</p>
          <span className="mt-4 inline-block text-sm font-semibold text-[#1E4D3A]">View Product &rarr;</span>
        </div>
      </Link>
    </motion.article>
  );
}

export default function ProductDetailsPage() {
  const { customer } = useCustomerAuth();
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistItemId, setWishlistItemId] = useState('');
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 0, count: 0 });

  useEffect(() => {
    async function loadProduct() {
      const selectedProduct = await getProductBySlug(slug);
      const allProducts = await getProducts();
      setProduct(selectedProduct);
      setRelatedProducts(allProducts.filter((item) => item.slug !== slug).slice(0, 3));
      setQuantity(1);
      setWishlisted(false);
      setWishlistItemId('');
      if (customer) {
        customerService.wishlist().then((data) => {
          const item = data.wishlist?.find((entry) => entry.productId === selectedProduct?.id);
          setWishlisted(Boolean(item));
          setWishlistItemId(item?.id || '');
        }).catch(() => {});
      }
      if (selectedProduct) {
        const recent = JSON.parse(localStorage.getItem('litepuffRecentlyViewed') || '[]');
        const next = [selectedProduct, ...recent.filter((item) => item.id !== selectedProduct.id)].slice(0, 8);
        localStorage.setItem('litepuffRecentlyViewed', JSON.stringify(next));
        contentService.reviews(selectedProduct.id).then((data) => setReviewSummary({ averageRating: data.averageRating || 0, count: data.count || 0 })).catch(() => {});
      }
    }
    loadProduct();
  }, [slug]);

  if (!product) return <div className="container-page py-12 text-sm">Loading product...</div>;

  const label = productLabelData[product.flavour];
  const image = productImages[product.flavour];
  const discount = product.oldPrice > product.price
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  return (
    <>
      <Seo title={product.name} description={product.shortDescription} path={`/products/${product.slug}`} image={image} />
      <main className="bg-[#FAF8F2] pb-12 text-brand-text md:pb-[60px] lg:pb-20">
        <div className="container-page pt-6"><OnlinePaymentOffer /></div>
        {/* Breadcrumb */}
        <nav className="container-page flex items-center gap-2 py-4 text-xs text-brand-text/50" aria-label="Breadcrumb">
          <Link to="/" className="transition-colors hover:text-[#1E4D3A]">Home</Link><span aria-hidden="true">/</span>
          <Link to="/products" className="transition-colors hover:text-[#1E4D3A]">Products</Link><span aria-hidden="true">/</span>
          <span className="truncate text-brand-text" aria-current="page">{product.name}</span>
        </nav>

        {/* Above-the-fold product area */}
        <motion.section {...reveal} className="container-page grid items-start gap-8 pb-12 md:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] md:gap-7 md:pb-[60px] lg:gap-10 lg:pb-20 xl:grid-cols-[minmax(0,42fr)_minmax(0,58fr)]">
          <ProductShowcase product={product} />

          <div className="min-w-0 py-1 lg:py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#C89B3C]">{product.category} Collection</p>
            <h1 className="mt-2 font-display text-[40px] font-semibold leading-[0.98] tracking-[-0.04em] lg:text-[52px]">{product.name}</h1>

            <div className="mt-3 flex items-center gap-3 text-xs">
              <span className="tracking-[0.14em] text-[#C89B3C]" aria-label={`${reviewSummary.averageRating || 0} out of 5 stars`}>{'★★★★★'}</span>
              <span className="text-brand-text/50">({reviewSummary.count} reviews)</span>
            </div>

            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="text-[30px] font-semibold tracking-[-0.03em]">{formatMoney(product.price)}</span>
              {product.oldPrice > product.price && <span className="text-sm text-brand-text/35 line-through">{formatMoney(product.oldPrice)}</span>}
              {discount > 0 && <span className="rounded-full bg-[#E5EFE8] px-3 py-1 text-[11px] font-bold text-[#1E4D3A]">Save {discount}%</span>}
            </div>

            <p className="mt-4 line-clamp-3 max-w-[650px] text-base leading-[1.8] text-brand-text/65">{product.shortDescription}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {highlights.map((highlight) => (
                <span key={highlight} className="rounded-full border border-[#ECE7DD] bg-white px-3.5 py-2 text-[11px] font-medium">{highlight}</span>
              ))}
            </div>

            <div className="mt-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-text/45">Quantity</p>
              <QuantitySelector quantity={quantity} setQuantity={setQuantity} />
            </div>

            <div className="mt-5">
              <ProductActions
                product={product}
                quantity={quantity}
                wishlisted={wishlisted}
                onToggleWishlist={async () => {
                  if (!customer) {
                    showToast('Please sign in to use wishlist.', 'error');
                    return;
                  }
                  try {
                    if (!wishlisted) {
                      const result = await customerService.addWishlist(product.id);
                      setWishlisted(true);
                      setWishlistItemId(result.item?.id || '');
                      showToast('Added to wishlist.');
                    } else {
                      if (wishlistItemId) await customerService.removeWishlist(wishlistItemId);
                      setWishlisted(false);
                      setWishlistItemId('');
                      showToast('Removed from wishlist.');
                    }
                  } catch (error) {
                    showToast(error.response?.data?.message || 'Wishlist update failed.', 'error');
                  }
                }}
                addToCart={addToCart}
              />
            </div>
          </div>
        </motion.section>

        <div className="container-page space-y-12 md:space-y-[60px] lg:space-y-20">
          {/* About this flavour */}
          <motion.section {...reveal} className="max-w-[650px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#C89B3C]">The flavour story</p>
            <h2 className={`mt-2 ${sectionHeading}`}>About This Flavour</h2>
            <p className="mt-5 text-base leading-[1.8] text-brand-text/70">{product.description}</p>
          </motion.section>

          {/* Product information */}
          {label && <ProductInformationGrid label={label} />}

          {/* Related products */}
          <motion.section {...reveal}>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#C89B3C]">Discover another flavour</p>
            <h2 className={`mt-2 ${sectionHeading}`}>You May Also Like</h2>
            <div className="mt-7 grid justify-items-center gap-6 md:grid-cols-3">
              {relatedProducts.map((item) => <RecommendationCard key={item.id} product={item} />)}
            </div>
          </motion.section>
        </div>
      </main>
    </>
  );
}
