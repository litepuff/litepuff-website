import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiChevronDown,
  FiSearch,
  FiShoppingBag,
  FiStar,
  FiX,
} from "react-icons/fi";
import Seo from "../components/Seo.jsx";
import { useCart } from "../context/CartContext.jsx";
import useMetaTracking from "../analytics/useMetaTracking.js";
import { formatMoney } from "../utils/formatMoney.js";
import periPeriImage from "../assets/images/products/peri-peri.png";
import mintImage from "../assets/images/products/mint.png";
import cheeseImage from "../assets/images/products/cheese.png";
import creamOnionImage from "../assets/images/products/cream-onion.png";
import saltPepperImage from "../assets/images/products/salt-pepper.png";
import bananaChipsImage from "../assets/images/products/banana-chips.png";
import ragiChipsImage from "../assets/images/products/ragi-chips.png";
import beetrootChipsImage from "../assets/images/products/beetroot.png";
import oatsChipsImage from "../assets/images/products/oats-chips.png";
import { useProducts } from "../hooks/useProducts.js";
import BuildYourBox from "../components/storefront/BuildYourBox.jsx";
import ProductPriceDisplay from "../components/ProductPriceDisplay.jsx";
import TrustStrip from "../components/TrustStrip.jsx";
import FinalShopCta from "../components/FinalShopCta.jsx";
import shopBanner from "../assets/images/banner.png";

export const shopProducts = [
  {
    id: "peri-peri-makhana",
    metaCatalogId: "ylq23re47d",
    slug: "peri-peri-makhana",
    name: "Peri Peri Makhana",
    tagline: "Smoky heat. Seriously crisp.",
    shortDescription:
      "Bold roasted makhana with tangy spice, smoky warmth and a clean crunch.",
    keywords: ["snack", "fox nuts", "lotus seeds", "spicy", "tangy", "roasted"],
    price: 211.65,
    weight: "70g",
    rating: 4.9,
    reviewCount: 254,
    popularity: 98,
    isNewest: true,
    bestSeller: true,
    stock: 48,
    flavour: "Peri Peri",
    category: "Roasted Makhana",
    image: periPeriImage,
  },
  {
    id: "mint-pudina-makhana",
    metaCatalogId: "jsvvhrmhkv",
    slug: "mint-pudina-makhana",
    name: "Mint Makhana",
    tagline: "Cool, bright and quietly addictive.",
    shortDescription:
      "Fresh pudina and a chaat-inspired lift for desks, journeys and chai breaks.",
    keywords: [
      "snack",
      "fox nuts",
      "lotus seeds",
      "pudina",
      "minty",
      "roasted",
    ],
    price: 211.65,
    weight: "70g",
    rating: 4.8,
    reviewCount: 218,
    popularity: 91,
    isNewest: false,
    bestSeller: false,
    stock: 48,
    flavour: "Mint",
    category: "Roasted Makhana",
    image: mintImage,
  },
  {
    id: "cheese-makhana",
    metaCatalogId: "50ta2tmgg3",
    slug: "cheese-makhana",
    name: "Cheese Makhana",
    tagline: "Rich flavour. Beautifully light.",
    shortDescription:
      "A satisfying cheesy crunch with classic comfort and none of the fried heaviness.",
    keywords: [
      "snack",
      "fox nuts",
      "lotus seeds",
      "cheesy",
      "creamy",
      "roasted",
    ],
    price: 211.65,
    weight: "70g",
    rating: 4.9,
    reviewCount: 286,
    popularity: 100,
    isNewest: false,
    bestSeller: true,
    stock: 48,
    flavour: "Cheese",
    category: "Roasted Makhana",
    image: cheeseImage,
  },
  {
    id: "cream-onion-makhana",
    metaCatalogId: "aj2tqtd7gb",
    slug: "cream-onion-makhana",
    name: "Cream & Onion Makhana",
    tagline: "Creamy, savoury and familiar.",
    shortDescription:
      "The much-loved cream and onion profile layered onto premium roasted fox nuts.",
    keywords: [
      "snack",
      "fox nuts",
      "lotus seeds",
      "creamy",
      "onion",
      "roasted",
    ],
    price: 211.65,
    weight: "70g",
    rating: 4.8,
    reviewCount: 231,
    popularity: 94,
    isNewest: true,
    bestSeller: true,
    stock: 48,
    flavour: "Cream & Onion",
    category: "Roasted Makhana",
    image: creamOnionImage,
  },
  {
    id: "salt-pepper-makhana",
    metaCatalogId: "uti8mwrq0k",
    slug: "salt-pepper-makhana",
    name: "Salt & Pepper Makhana",
    tagline: "Simple seasoning. Remarkable crunch.",
    shortDescription:
      "Rock salt and cracked pepper keep every roasted handful balanced and crisp.",
    keywords: [
      "snack",
      "fox nuts",
      "lotus seeds",
      "peppery",
      "classic",
      "roasted",
    ],
    price: 211.65,
    weight: "70g",
    rating: 4.7,
    reviewCount: 196,
    popularity: 88,
    isNewest: false,
    bestSeller: false,
    stock: 48,
    flavour: "Salt & Pepper",
    category: "Roasted Makhana",
    image: saltPepperImage,
  },
];

const upcomingProducts = [
  {
    name: "Banana Chips",
    description:
      "Naturally crunchy banana chips finished with a light, balanced seasoning.",
    image: bananaChipsImage,
  },
  {
    name: "Ragi Chips",
    description:
      "A crisp, modern take on nutrient-rich ragi with bold everyday flavour.",
    image: ragiChipsImage,
  },
  {
    name: "Beetroot Chips",
    description:
      "Earthy beetroot transformed into a colourful and satisfying crunch.",
    image: beetrootChipsImage,
  },
  {
    name: "Oats Masala Chips",
    description:
      "Wholesome oats paired with a lively, savoury masala seasoning.",
    image: oatsChipsImage,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

function FilterSelect({ label, value, onChange, children }) {
  return (
    <label className="relative block shrink-0 snap-start">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className="h-11 min-w-[140px] max-w-[78vw] appearance-none rounded-full border border-[#E2DBCF] bg-white py-0 pl-4 pr-10 text-sm font-semibold text-[#243029] outline-none transition-colors hover:border-[#B9AE9D] focus:border-[#1E4D3A] focus-visible:ring-2 focus-visible:ring-[#1E4D3A]/15 sm:min-w-[150px]"
      >
        {children}
      </select>
      <FiChevronDown
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#68706B]"
        size={16}
        aria-hidden="true"
      />
    </label>
  );
}

function ProductRating({ rating, reviewCount }) {
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`${rating} out of 5 stars from ${reviewCount} reviews`}
    >
      <span className="flex text-[#C89B3C]" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <FiStar key={index} className="h-3.5 w-3.5 fill-current" />
        ))}
      </span>
      <span className="text-xs text-[#5F6762]">
        {rating} ({reviewCount})
      </span>
    </div>
  );
}

const ProductCard = memo(function ProductCard({ product, onAddToCart }) {
  return (
    <article className="group flex h-full min-w-0 max-w-full flex-col overflow-hidden rounded-[28px] border border-[#E7E1D7] bg-white p-4 shadow-[0_8px_24px_rgba(36,48,41,0.045)] transition-transform sm:p-5 md:hover:-translate-y-1">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[22px] bg-[#FAF8F2] p-5">
        <span className="absolute right-3 top-3 rounded-full bg-[#1F5E3B] px-3 py-1.5 text-[10px] font-black text-white shadow-sm">
          15% OFF
        </span>
        <img
          src={product.image}
          alt={`${product.name} LitePuff jar`}
          className="h-full w-full object-contain transition-transform md:group-hover:scale-[1.02]"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="flex flex-1 flex-col pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
          {product.category}
        </p>
        <h2 className="mt-2 break-words font-display text-[28px] font-semibold leading-[1.05] text-[#243029]">
          {product.name}
        </h2>
        <p className="mt-2 min-h-10 text-sm font-semibold leading-5 text-[#4E5550]">
          {product.tagline}
        </p>
        <div className="mt-3">
          <ProductRating
            rating={product.rating}
            reviewCount={product.reviewCount}
          />
        </div>
        <p className="mt-4 min-h-[72px] text-sm leading-6 text-[#5F6762]">
          {product.shortDescription}
        </p>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#ECE7DD] pt-4">
          <ProductPriceDisplay price={product.price} mrp={product.regularPrice || product.oldPrice} priceClassName="text-[28px]" />
          <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.1em] text-[#68706B]">
            {product.weight} · In Stock
          </span>
        </div>
        <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#1F5E3B] px-5 text-sm font-semibold text-white transition-transform md:hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#C9A227]"
          >
            <FiShoppingBag aria-hidden="true" />
            Add to Cart
          </button>
          <Link
            to={`/products/${product.slug}`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#1F5E3B] px-5 text-sm font-semibold text-[#1F5E3B] transition-colors hover:bg-[#1F5E3B] hover:text-white"
          >
            View Details
            <FiArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
});

const UpcomingCard = memo(function UpcomingCard({ product }) {
  return (
    <article className="group flex h-full min-w-0 max-w-full flex-col overflow-hidden rounded-[28px] border border-[#E7E1D7] bg-white p-5 shadow-[0_8px_24px_rgba(36,48,41,0.045)] transition-transform md:hover:-translate-y-1">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[22px] bg-[#FAF8F2] p-5">
        <span className="absolute left-4 top-4 z-10 rounded-full bg-[#1E4D3A] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
          Coming Soon
        </span>
        <img
          src={product.image}
          alt={`Preview of ${product.name}`}
          className="h-full w-full object-contain transition-transform md:group-hover:scale-[1.02]"
          loading="lazy"
          decoding="async"
        />
      </div>
      <h3 className="mt-5 font-display text-[28px] font-semibold leading-none text-[#243029]">
        {product.name}
      </h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-[#5F6762]">
        {product.description}
      </p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#C89B3C]">
        Launching Soon
      </p>
      <a
        href={`mailto:gnenterprises@gmail.com?subject=${encodeURIComponent(`Notify me about ${product.name}`)}`}
        className="mt-5 inline-flex h-12 items-center justify-center rounded-full border border-[#1E4D3A] text-sm font-semibold text-[#1E4D3A] transition-[transform,background-color,color] hover:bg-[#1E4D3A] hover:text-white md:hover:-translate-y-0.5"
      >
        Notify Me
      </a>
    </article>
  );
});

export default function Shop() {
  const { addToCart } = useCart();
  const { trackSearch, trackViewCategory } = useMetaTracking();
  const { products: sheetProducts } = useProducts();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [flavourFilter, setFlavourFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const lastTrackedSearch = useRef("");
  const selectFilter = (setter, filterName, currentValue) => (event) => {
    const nextValue = event.target.value;
    if (nextValue === currentValue) return;
    setter(nextValue);
    try {
      trackViewCategory(`${filterName}:${nextValue}`);
    } catch {
      // Analytics is optional and must never affect filtering.
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const query = debouncedSearch.trim().replace(/\s+/g, " ");
    if (query.length < 2 || query === lastTrackedSearch.current) return;
    lastTrackedSearch.current = query;
    trackSearch(query);
  }, [debouncedSearch, trackSearch]);

  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSortBy("newest");
    setFlavourFilter("all");
    setPriceFilter("all");
    setStockFilter("all");
  };

  const visibleProducts = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase().replace(/\s+/g, " ");
    const catalogProducts = shopProducts.map((product) => {
      const live = sheetProducts.find(
        (item) => item.id === product.id || item.slug === product.slug,
      );
      return live
        ? {
            ...product,
            ...live,
            price: live.price,
            regularPrice: 249,
            oldPrice: 249,
            image: live.image || product.image,
            tagline: product.tagline,
            keywords: product.keywords,
            rating: product.rating,
            reviewCount: product.reviewCount,
            popularity: product.popularity,
            isNewest: product.isNewest,
          }
        : { ...product, regularPrice: 249, oldPrice: 249 };
    });
    let result = catalogProducts.filter((product) => {
      const searchableText = [
        product.name,
        product.category,
        product.flavour,
        product.tagline,
        product.shortDescription,
        ...product.keywords,
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!query || searchableText.includes(query)) &&
        (flavourFilter === "all" || product.flavour === flavourFilter) &&
        (priceFilter === "all" ||
          (priceFilter === "200-300" &&
            product.price >= 200 &&
            product.price <= 300)) &&
        (stockFilter === "all" || product.stock > 0)
      );
    });
    return result.sort((a, b) =>
      sortBy === "price-low"
        ? a.price - b.price
        : sortBy === "price-high"
          ? b.price - a.price
          : sortBy === "alpha"
            ? a.name.localeCompare(b.name)
            : sortBy === "best"
              ? Number(b.bestSeller) - Number(a.bestSeller)
              : sortBy === "popular"
                ? b.popularity - a.popularity
                : Number(b.isNewest) - Number(a.isNewest),
    );
  }, [
    debouncedSearch,
    flavourFilter,
    priceFilter,
    sheetProducts,
    stockFilter,
    sortBy,
  ]);

  const activeChips = [
    flavourFilter !== "all" && {
      label: flavourFilter,
      clear: () => setFlavourFilter("all"),
    },
    priceFilter !== "all" && {
      label: "₹200–₹300",
      clear: () => setPriceFilter("all"),
    },
    stockFilter !== "all" && {
      label: "In Stock",
      clear: () => setStockFilter("all"),
    },
  ].filter(Boolean);
  const handleAdd = (product) =>
    addToCart({
      ...product,
      originalPrice: Number(product.regularPrice || product.oldPrice || 249),
      images: [product.image],
      description: product.shortDescription,
    });

  return (
    <>
      <Seo
        title="Shop"
        description="Shop LitePuff roasted makhana and preview upcoming healthy snacks."
        path="/products"
      />
      <main className="overflow-x-clip bg-[#FAF8F2] pb-10 md:pb-16">
        <motion.header
          className="mx-auto grid max-w-7xl items-center gap-7 px-4 py-10 sm:px-6 md:grid-cols-[.8fr_1.2fr] md:py-14 lg:px-8"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <div><p className="text-xs font-bold uppercase tracking-[.28em] text-[#A97826]">The LitePuff Shop</p><h1 className="mt-3 text-balance font-display text-[44px] font-semibold leading-[.98] tracking-[-0.04em] text-[#243029] sm:text-5xl lg:text-[60px]">Find your favourite crunch.</h1><p className="mt-4 max-w-[520px] text-base leading-7 text-[#5F6762]">Choose a flavour, build your own box and make everyday snacking more rewarding.</p><a href="#products-title" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-[#1E4D3A] px-6 text-sm font-bold text-white">Shop Makhana <FiArrowRight /></a></div>
          <div className="overflow-hidden rounded-[26px] bg-[#F1E8D7]"><img src={shopBanner} alt="LitePuff snack collection" width="1899" height="828" className="block h-auto w-full object-contain" loading="eager" decoding="async" /></div>
        </motion.header>
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8"><BuildYourBox /><nav className="scrollbar-hidden flex gap-2 overflow-x-auto border-b border-[#DDD5C8] py-6" aria-label="Shop categories">{[['All','products-title'],['Makhana','products-title'],['Chips','coming-soon-title'],['Coming Soon','coming-soon-title']].map(([label,target]) => <button key={label} type="button" onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' })} className="shrink-0 rounded-full border border-[#D8CFC0] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[.12em] text-[#243029] transition hover:border-[#1E4D3A] hover:bg-[#1E4D3A] hover:text-white">{label}</button>)}</nav></div>
        <div className="sticky z-30 mx-auto max-w-[1440px] px-3 md:px-6 lg:px-8" style={{ top: 'calc(var(--announcement-height, 0px) + var(--navbar-height) + 4px)' }}>
          <section
            className="w-full max-w-full overflow-hidden rounded-[22px] border border-[#E7E1D7] bg-white p-3 shadow-[0_8px_22px_rgba(36,48,41,0.08)]"
            aria-label="Shop filters"
          >
            <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(280px,1fr)_auto_auto]">
              <label className="relative block">
                <span className="sr-only">Search products</span>
                <FiSearch
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#68706B]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search snacks, flavours or categories..."
                  className="h-11 w-full rounded-full border border-[#E2DBCF] bg-[#FAF8F2] pl-11 pr-11 text-sm outline-none transition-all focus:border-[#1E4D3A] focus:bg-white lg:focus:shadow-[0_0_0_3px_rgba(30,77,58,0.08)]"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[#68706B] hover:bg-[#ECE7DD]"
                    aria-label="Clear search"
                  >
                    <FiX />
                  </button>
                ) : null}
              </label>
              <div className="scrollbar-hidden -mx-1 flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 md:flex-wrap lg:mx-0 lg:flex-nowrap lg:overflow-visible lg:px-0 lg:pb-0">
                <FilterSelect
                  label="Sort products"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price Low to High</option>
                  <option value="price-high">Price High to Low</option>
                  <option value="best">Best Selling</option>
                  <option value="alpha">Alphabetical</option>
                  <option value="popular">Most Popular</option>
                </FilterSelect>
                <FilterSelect
                  label="Filter by flavour"
                  value={flavourFilter}
                  onChange={selectFilter(setFlavourFilter, "flavour", flavourFilter)}
                >
                  <option value="all">All Flavours</option>
                  {shopProducts.map((product) => (
                    <option key={product.flavour} value={product.flavour}>
                      {product.flavour}
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect
                  label="Filter by price"
                  value={priceFilter}
                  onChange={selectFilter(setPriceFilter, "price", priceFilter)}
                >
                  <option value="all">Price</option>
                  <option value="200-300">₹200–₹300</option>
                </FilterSelect>
                <FilterSelect
                  label="Filter by availability"
                  value={stockFilter}
                  onChange={selectFilter(setStockFilter, "availability", stockFilter)}
                >
                  <option value="all">Availability</option>
                  <option value="in">In Stock</option>
                </FilterSelect>
              </div>
              <p
                className="flex items-center whitespace-nowrap px-2 text-sm text-[#5F6762]"
                aria-live="polite"
              >
                Showing{" "}
                <strong className="ml-1 text-[#243029]">
                  {visibleProducts.length}{" "}
                  {visibleProducts.length === 1 ? "Product" : "Products"}
                </strong>
              </p>
            </div>
            {activeChips.length ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#ECE7DD] pt-3">
                  {activeChips.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={chip.clear}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#F3EFE6] px-3 text-xs font-semibold text-[#243029]"
                    >
                      {chip.label}
                      <FiX aria-hidden="true" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold text-[#1E4D3A] underline underline-offset-4"
                  >
                    Clear All
                  </button>
                </div>
              ) : null}
          </section>
        </div>

        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <section className="pb-7 pt-4 md:pb-9 md:pt-6" aria-labelledby="products-title">
            <p className="text-xs font-bold uppercase tracking-[.24em] text-[#C89B3C]">Shop LitePuff</p>
            <h2 id="products-title" className="mt-2 font-display text-4xl font-semibold text-[#243029]">Our Products</h2>
            {visibleProducts.length ? (
              <motion.div
                className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                initial="hidden"
                animate="visible"
                variants={stagger}
              >
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAdd}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                className="rounded-[28px] border border-[#E7E1D7] bg-white px-6 py-12 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <FiSearch
                  className="mx-auto h-10 w-10 text-[#C89B3C]"
                  aria-hidden="true"
                />
                <h2 className="mt-4 font-display text-4xl font-semibold">
                  No Products Found
                </h2>
                <p className="mt-2 text-sm text-[#5F6762]">
                  Try changing your search or filters.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-6 h-11 rounded-full bg-[#1E4D3A] px-6 text-sm font-semibold text-white"
                >
                  Clear Filters
                </button>
              </motion.div>
            )}
          </section>
          <section className="my-4 flex flex-col items-start justify-between gap-5 border-y border-[#DCD3C5] py-8 sm:flex-row sm:items-center" aria-label="Build your own LitePuff box"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-[#A97826]">Build Your Own Box</p><h2 className="mt-2 font-display text-3xl font-semibold text-[#243029]">Your flavours. Your perfect combo.</h2></div><button type="button" onClick={() => window.dispatchEvent(new CustomEvent('litepuff:open-combo', { detail: { comboType: 'COMBO_2' } }))} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#1E4D3A] px-6 text-sm font-bold text-white">Start Building <FiArrowRight /></button></section>
          <section
            className="border-t border-[#E2DBCF] py-10 md:py-12"
            aria-labelledby="coming-soon-title"
          >
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C89B3C]">
                Coming Soon
              </p>
              <h2
                id="coming-soon-title"
                className="mt-2 font-display text-[38px] font-semibold leading-none text-[#243029] md:text-[46px]"
              >
                The Next LitePuff Crunch
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#5F6762]">
                Four smarter snack ideas are taking shape. Be first to hear when
                they arrive.
              </p>
            </div>
            <motion.div
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={stagger}
            >
              {upcomingProducts.map((product) => (
                <UpcomingCard key={product.name} product={product} />
              ))}
            </motion.div>
          </section>
        </div>
        <TrustStrip />
        <FinalShopCta />
      </main>
    </>
  );
}
