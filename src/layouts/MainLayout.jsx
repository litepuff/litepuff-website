import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import Navbar from '../components/Navbar.jsx';
import CookieBanner from '../components/CookieBanner.jsx';
import ScrollToTop from '../components/ScrollToTop.jsx';
import FloatingWhatsApp from '../components/FloatingWhatsApp.jsx';
import WelcomeOffer from '../components/WelcomeOffer.jsx';
import FloatingCoupon from '../components/FloatingCoupon.jsx';

export default function MainLayout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-[#FAF8F2]">
      <ScrollToTop />
      <WelcomeOffer />
      <Navbar />
      <main className={pathname === '/' ? 'home-main' : 'site-main'}><Outlet /></main>
      <Footer />
      <CookieBanner />
      <FloatingWhatsApp />
      <FloatingCoupon />
    </div>
  );
}
