import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import Navbar from '../components/Navbar.jsx';
import CookieBanner from '../components/CookieBanner.jsx';
import ScrollToTop from '../components/ScrollToTop.jsx';
import FloatingWhatsApp from '../components/FloatingWhatsApp.jsx';
import EntryComboPopup from '../components/storefront/EntryComboPopup.jsx';
import FestivalSaleBar from '../components/storefront/FestivalSaleBar.jsx';
import OfferSection from '../components/offers/OfferSection.jsx';
import { useProducts } from '../hooks/useProducts.js';

export default function MainLayout() {
  const { pathname } = useLocation();
  const { products } = useProducts();
  const hasFestivalBar = pathname === '/' || pathname === '/products' || pathname === '/shop';

  return (
    <div className="min-h-screen max-w-full overflow-x-clip bg-[#FAF8F2]" style={{ '--announcement-height': hasFestivalBar ? 'var(--festival-banner-height)' : '0px' }}>
      <ScrollToTop />
      {hasFestivalBar && <FestivalSaleBar />}
      <Navbar />
      <main className={pathname === '/' ? 'home-main' : 'site-main'}><Outlet /></main>
      <Footer />
      <CookieBanner />
      <FloatingWhatsApp />
      {pathname === '/' && <EntryComboPopup />}
      <OfferSection products={products} showCards={false} />
    </div>
  );
}
