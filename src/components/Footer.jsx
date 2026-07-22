import { Link } from 'react-router-dom';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { FiInstagram } from 'react-icons/fi';
import logo from '../assets/images/navbar-logo.png';

const quickLinks = [['Home', '/'], ['Shop', '/products'], ['About', '/about'], ['Blog', '/blog'], ['Contact', '/contact']];
const supportLinks = [['Shipping Policy', '/shipping-policy'], ['Return Policy', '/returns-policy'], ['Refund Policy', '/refund-policy'], ['Privacy Policy', '/privacy-policy'], ['Terms & Conditions', '/terms'], ['FAQ', '/faq']];
const linkClass = 'w-fit text-sm text-[#4E5550] transition-colors hover:text-[#1E4D3A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#C89B3C]';

function FooterLinks({ title, links }) {
  return <section><h2 className="text-sm font-bold uppercase tracking-[0.16em] text-[#243029]">{title}</h2><nav className="mt-4 grid gap-2.5" aria-label={`${title} footer links`}>{links.map(([label, to]) => <Link key={label} to={to} className={linkClass}>{label}</Link>)}</nav></section>;
}

export default function Footer() {
  const message = encodeURIComponent("Hello LitePuff! I'd like to know more about your products.");
  return (
    <footer className="border-t border-[#E2DBCF] bg-[#F3EFE6] px-6 py-10 text-[#243029] lg:px-8" aria-label="Site footer">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.35fr_.7fr_1fr_1.15fr] lg:gap-10">
          <section><Link to="/" className="inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C89B3C]" aria-label="LitePuff home"><img src={logo} alt="LitePuff" className="h-14 w-auto object-contain" width="165" height="56" /></Link><p className="mt-4 max-w-[310px] text-sm leading-6 text-[#4E5550]">Healthy snacks crafted with premium ingredients for modern everyday living.</p></section>
          <FooterLinks title="Quick Links" links={quickLinks} />
          <FooterLinks title="Customer Support" links={supportLinks} />
          <section><h2 className="text-sm font-bold uppercase tracking-[0.16em]">Contact</h2><address className="mt-4 grid gap-3 not-italic text-sm text-[#4E5550]"><a className="flex items-center gap-2 hover:text-[#1E4D3A]" href="mailto:gnenterprises@gmail.com"><Mail size={16} aria-hidden="true" />gnenterprises@gmail.com</a><a className="flex items-center gap-2 hover:text-[#1E4D3A]" href="tel:+911135809124"><Phone size={16} aria-hidden="true" />+91 1135809124</a><a className="flex items-center gap-2 hover:text-[#1E4D3A]" href={`https://wa.me/918700015378?text=${message}`} target="_blank" rel="noreferrer"><MessageCircle size={16} aria-hidden="true" />+91 8700015378</a><a className="flex items-center gap-2 hover:text-[#1E4D3A]" href="https://instagram.com/litepuff_" target="_blank" rel="noreferrer"><FiInstagram size={16} aria-hidden="true" />@litepuff_</a></address></section>
        </div>
        <div className="mt-9 flex flex-col gap-2 border-t border-[#D8D0C3] pt-6 text-center text-xs text-[#68706B] sm:flex-row sm:items-center sm:justify-between sm:text-left"><p>© 2026 LitePuff. All Rights Reserved.</p><p>Designed with <span role="img" aria-label="love">❤️</span> in India.</p></div>
      </div>
    </footer>
  );
}
