import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import { FiSearch, FiShoppingBag, FiUser } from 'react-icons/fi';
import { HiOutlineMenuAlt3, HiOutlineX } from 'react-icons/hi';
import { FiChevronDown } from 'react-icons/fi';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCart } from '../context/CartContext.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import logo from '../assets/images/navbar-logo.png';
import CartDrawer from './CartDrawer.jsx';
import SearchOverlay from './SearchOverlay.jsx';
import { useProducts } from '../hooks/useProducts.js';
import { useOffers } from '../hooks/useOffers.js';
import { formatMoney } from '../utils/formatMoney.js';

const navigationLinks = [
  { label: 'Home', path: '/' },
  { label: 'Shop', path: '/products' },
  { label: 'About', path: '/about' },
  { label: 'Blog', path: '/blog' },
  { label: 'Contact', path: '/contact' },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isMobileShopOpen, setIsMobileShopOpen] = useState(false);
  const shopMenuRef = useRef(null);
  const { cartCount } = useCart();
  const { customer } = useCustomerAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { products } = useProducts();
  const offers = useOffers();
  const reduceMotion = useReducedMotion();
  const catalogue = products.filter((product) => String(product.status || 'active').toLowerCase() === 'active');
  const isHomePage = pathname === '/';
  const isSolidHeader = !isHomePage || hasScrolled || isMenuOpen;

  useEffect(() => {
    const updateHeader = () => setHasScrolled(window.scrollY > 50);

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    return () => window.removeEventListener('scroll', updateHeader);
  }, []);

  useEffect(() => setIsMenuOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  useEffect(() => {
    const closeShop = (event) => {
      if (event.key === 'Escape' || (event.type === 'pointerdown' && !shopMenuRef.current?.contains(event.target))) setIsShopOpen(false);
    };
    document.addEventListener('pointerdown', closeShop);
    document.addEventListener('keydown', closeShop);
    return () => { document.removeEventListener('pointerdown', closeShop); document.removeEventListener('keydown', closeShop); };
  }, []);

  const isNavigationActive = (link) => {
    if (link.label === 'Home') return pathname === '/';
    if (link.label === 'Shop') return pathname === '/products' || pathname === '/shop' || pathname.startsWith('/products/');
    return pathname === link.path || pathname.startsWith(`${link.path}/`);
  };

  const desktopLinkClass = (isActive) => [
    'group relative rounded-full px-2.5 py-2 text-[15px] font-medium text-[#243029] transition-colors duration-300 hover:text-[#1E4D3A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C89B3C]',
    isActive ? 'text-[#1E4D3A]' : '',
  ].join(' ');

  const mobileLinkClass = (isActive) => [
    'flex min-h-12 items-center rounded-2xl px-4 text-base font-medium transition-colors',
    isActive ? 'bg-[#1E4D3A] text-white' : 'text-[#243029] hover:bg-[#FAF8F2]',
  ].join(' ');

  return (
    <header className={[
      'site-navbar fixed left-0 right-0 z-50 border-b backdrop-blur-sm transition-[top,background-color,border-color,box-shadow] duration-300 ease-out',
      isSolidHeader
        ? 'border-[#ECE7DD] bg-[#FAF8F2] shadow-[0_6px_20px_rgba(0,0,0,0.05)]'
        : 'border-[#ECE7DD]/70 bg-[#FAF8F2]/90 shadow-none',
    ].join(' ')}>
      <nav className="mx-auto flex h-[72px] max-w-7xl items-center gap-4 px-5 sm:px-6 md:h-[76px] lg:h-20 lg:px-10" aria-label="Main navigation">
        {/* ==========================
            LitePuff Logo
        ========================== */}
        <NavLink to="/" className="inline-flex shrink-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C]" aria-label="LitePuff home">
          <img src={logo} alt="LitePuff — Crispy. Tasty. Lite." className="block h-12 w-auto min-w-max shrink-0 object-contain md:h-[52px] lg:h-[60px]" width="176" height="60" />
        </NavLink>

        {/* ==========================
            Desktop Navigation
        ========================== */}
        <div className="ml-auto hidden items-center gap-1.5 lg:flex xl:gap-3">
          {navigationLinks.map((link) => link.label === 'Shop' ? <div ref={shopMenuRef} key="Shop" className="relative" onMouseEnter={() => setIsShopOpen(true)} onMouseLeave={() => setIsShopOpen(false)} onFocus={() => setIsShopOpen(true)} onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setIsShopOpen(false)}>
            <div className={`${desktopLinkClass(isNavigationActive(link))} inline-flex items-center gap-0 p-0`}>
              <NavLink to="/products" className="rounded-l-full py-2 pl-2.5 pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C89B3C]">Shop</NavLink>
              <button type="button" onClick={() => setIsShopOpen((open) => !open)} className="rounded-r-full py-2 pl-1 pr-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C89B3C]" aria-label="Open Shop menu" aria-haspopup="true" aria-expanded={isShopOpen}><FiChevronDown className={`transition-transform duration-200 ${isShopOpen ? 'rotate-180' : ''}`} /></button>
            </div>
            <AnimatePresence>{isShopOpen && <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8, scale: .99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: reduceMotion ? 0 : .2 }} className="absolute left-1/2 top-full w-[340px] -translate-x-1/2 pt-3"><div className="rounded-[20px] border border-[#E4DDD0] bg-[#FFFEFA] p-3 shadow-[0_18px_48px_rgba(36,48,41,.14)]"><NavLink to="/products" className="block rounded-xl px-3 py-2 text-sm font-bold text-[#1E4D3A] hover:bg-[#F4EFE5]">All Products</NavLink><div className="my-2 h-px bg-[#E9E2D7]" />{catalogue.map((product) => <NavLink key={product.id} to={`/products/${product.slug}`} className="block rounded-xl px-3 py-2 text-sm text-[#404943] hover:bg-[#F4EFE5]">{product.name}</NavLink>)}<div className="my-2 h-px bg-[#E9E2D7]" />{offers.combo2.enabled && <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('litepuff:open-combo', { detail: { comboType: 'COMBO_2' } }))} className="block w-full rounded-xl px-3 py-2 text-left text-xs font-bold uppercase tracking-[.08em] text-[#A97826] hover:bg-[#F4EFE5]">Buy 2 · {formatMoney(offers.combo2.price)}</button>}{offers.combo3.enabled && <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('litepuff:open-combo', { detail: { comboType: 'COMBO_3' } }))} className="block w-full rounded-xl px-3 py-2 text-left text-xs font-bold uppercase tracking-[.08em] text-[#A97826] hover:bg-[#F4EFE5]">Buy 3 · {formatMoney(offers.combo3.price)}</button>}<NavLink to="/products" className="mt-2 flex items-center justify-between rounded-xl bg-[#1E4D3A] px-3 py-2.5 text-sm font-bold text-white">View All Products <span aria-hidden="true">→</span></NavLink></div></motion.div>}</AnimatePresence>
          </div> : (
            <NavLink key={link.label} to={link.path} end={link.path === '/'} className={desktopLinkClass(isNavigationActive(link))}>
              {() => {
                const isActive = isNavigationActive(link);
                return (
                <>
                  {link.label}
                  <span className={['absolute bottom-0.5 left-2.5 right-2.5 h-[2px] origin-left rounded-full bg-[#C89B3C] transition-transform duration-200', isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'].join(' ')} aria-hidden="true" />
                </>
                );
              }}
            </NavLink>
          ))}
        </div>

        {/* ==========================
            Utility Actions
        ========================== */}
        <div className="ml-auto hidden items-center gap-1 lg:flex xl:ml-2">
          <button type="button" onClick={() => setIsSearchOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full text-[#1E4D3A] transition-colors duration-300 hover:text-[#C89B3C]" aria-label="Search products"><FiSearch size={22} /></button>
          <button type="button" onClick={() => setIsCartOpen(true)} className="relative flex h-11 w-11 items-center justify-center rounded-full text-[#1E4D3A] transition-colors duration-300 hover:text-[#C89B3C]" aria-label={`Open cart with ${cartCount} items`} aria-expanded={isCartOpen} aria-controls="cart-drawer">
            <FiShoppingBag size={22} />
            {cartCount > 0 ? <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#C89B3C] px-1 text-[10px] font-semibold text-[#243029]">{cartCount > 99 ? '99+' : cartCount}</span> : null}
          </button>
          <NavLink to={customer ? '/profile' : '/login'} className={`relative flex h-10 w-10 items-center justify-center rounded-full text-[#1E4D3A] transition-colors duration-300 hover:text-[#C89B3C] ${customer ? 'bg-[#E7EFE9]' : ''}`} aria-label={customer ? `${customer.firstName || 'Customer'} account` : 'Sign in'}><FiUser size={22} />{customer ? <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-[#FAF8F2] bg-[#C89B3C]" aria-hidden="true" /> : null}</NavLink>
          <NavLink to="/products" className="ml-2 inline-flex h-12 items-center justify-center rounded-full bg-[#1E4D3A] px-7 text-base font-semibold text-white transition-colors duration-300 hover:bg-[#2C614A]">Shop Now</NavLink>
        </div>

        {/* ==========================
            Mobile Menu Toggle
        ========================== */}
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <button type="button" onClick={() => setIsCartOpen(true)} className="relative flex h-11 w-11 items-center justify-center rounded-full text-[#1E4D3A]" aria-label={`Open cart with ${cartCount} items`} aria-expanded={isCartOpen} aria-controls="cart-drawer">
            <FiShoppingBag size={22} />
            {cartCount > 0 ? <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#C89B3C] px-1 text-[10px] font-semibold">{cartCount}</span> : null}
          </button>
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ECE7DD] bg-white text-[#1E4D3A]" aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={isMenuOpen} aria-controls="mobile-navigation" onClick={() => setIsMenuOpen((open) => !open)}>
            {isMenuOpen ? <HiOutlineX size={22} /> : <HiOutlineMenuAlt3 size={22} />}
          </button>
        </div>
      </nav>

      {/* ==========================
          Mobile Navigation
      ========================== */}
      <div id="mobile-navigation" className={['overflow-hidden border-t border-[#ECE7DD] bg-[#FAF8F2] transition-all duration-300 lg:hidden', isMenuOpen ? 'max-h-[620px] opacity-100' : 'max-h-0 opacity-0'].join(' ')}>
        <div className="mx-auto grid max-w-7xl gap-2 px-6 py-5">
          {navigationLinks.map((link) => link.label === 'Shop' ? <div key="Shop"><div className={`${mobileLinkClass(isNavigationActive(link))} justify-between p-0`}><NavLink to="/products" className="flex min-h-12 flex-1 items-center px-4">Shop</NavLink><button type="button" onClick={() => setIsMobileShopOpen((open) => !open)} className="grid min-h-12 min-w-12 place-items-center rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C89B3C]" aria-label="Expand Shop menu" aria-expanded={isMobileShopOpen}><FiChevronDown className={isMobileShopOpen ? 'rotate-180' : ''} /></button></div>{isMobileShopOpen && <div className="ml-4 mt-2 grid gap-1 border-l border-[#D8CFBF] pl-3"><NavLink to="/products" className="px-3 py-2 text-sm font-bold text-[#1E4D3A]">All Products</NavLink>{catalogue.map((product) => <NavLink key={product.id} to={`/products/${product.slug}`} className="px-3 py-2 text-sm text-[#4E5550]">{product.name}</NavLink>)}</div>}</div> : <NavLink key={link.label} to={link.path} end={link.path === '/'} className={mobileLinkClass(isNavigationActive(link))}>{link.label}</NavLink>)}
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[#ECE7DD] pt-4">
            <button type="button" onClick={() => setIsSearchOpen(true)} className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#1E4D3A] text-base font-medium text-[#1E4D3A]"><FiSearch size={22} /> Search</button>
            <NavLink to={customer ? '/profile' : '/login'} className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#1E4D3A] text-base font-medium text-[#1E4D3A]"><FiUser size={22} /> {customer ? 'My Account' : 'Sign In'}</NavLink>
          </div>
          <NavLink to="/products" className="mt-1 flex h-12 items-center justify-center rounded-full bg-[#1E4D3A] px-7 text-base font-semibold text-white">Shop Now</NavLink>
        </div>
      </div>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={() => {
          setIsCartOpen(false);
          navigate('/checkout');
        }}
      />
      <SearchOverlay open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
