import { Link } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';
import logo from '../assets/images/navbar-logo.png';

export default function CheckoutHeader() {
  return <header className="sticky top-0 z-50 border-b border-[#E7E0D5] bg-[#FAF8F2]/95 backdrop-blur"><div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-6 lg:px-10"><Link to="/" aria-label="LitePuff home" className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C89B3C]"><img src={logo} alt="LitePuff" className="h-11 w-auto object-contain" /></Link><div className="hidden items-center gap-2 text-xs font-semibold text-[#6B726D] sm:flex"><span>Cart</span><span aria-hidden="true">→</span><strong className="text-[#1E4D3A]">Address</strong><span aria-hidden="true">→</span><span>Payment</span></div><p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#1E4D3A]"><FiLock aria-hidden="true" /> Secure Checkout</p></div></header>;
}
