import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail, MessageCircle, Phone } from 'lucide-react';
import { FiInstagram } from 'react-icons/fi';
import { contentService } from '../services/contentService.js';
import { useToast } from '../context/ToastContext.jsx';
import { siteConfig } from '../utils/siteConfig.js';
import logo from '../assets/images/navbar-logo.png';

const columns = [
  { title: 'Shop', links: [['All Products', '/products'], ['Makhana', '/products'], ['Build Your Combo', '#combo'], ['Offers', '/products']] },
  { title: 'About', links: [['Our Story', '/about'], ['Why LitePuff', '/about'], ['Blog', '/blog']] },
  { title: 'Help', links: [['Contact', '/contact'], ['FAQ', '/faq'], ['Shipping', '/shipping-policy'], ['Returns', '/returns-policy']] },
];
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#C89B3C]';
const whatsappNumber = String(siteConfig.whatsapp || '').replace(/\D/g, '');

export default function Footer() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const openCombo = (event) => { event.preventDefault(); window.dispatchEvent(new CustomEvent('litepuff:open-combo', { detail: { comboType: 'COMBO_2' } })); };
  const subscribe = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    try { await contentService.newsletter(email); setEmail(''); showToast("You're subscribed to LitePuff updates."); }
    catch { showToast("We couldn't subscribe you right now. Please try again.", 'error'); }
    finally { setLoading(false); }
  };

  const socials = [
    [siteConfig.instagram, 'LitePuff on Instagram', FiInstagram],
    [`https://wa.me/91${whatsappNumber}`, 'Contact LitePuff on WhatsApp', MessageCircle],
    [`mailto:${siteConfig.email}`, 'Email LitePuff', Mail],
  ];

  return <footer className="bg-[#173F31] px-5 pb-6 pt-14 text-white sm:px-6 md:pt-16 lg:px-10" aria-label="Site footer"><div className="mx-auto max-w-7xl">
    <div className="grid gap-11 border-b border-white/15 pb-11 lg:grid-cols-[1.1fr_.95fr_1.15fr] lg:gap-14">
      <section><Link to="/" aria-label="LitePuff home" className={`inline-flex rounded bg-[#FAF8F2] px-3 py-2 ${focus}`}><img src={logo} alt="LitePuff" className="h-12 w-auto object-contain" width="150" height="48" /></Link><p className="mt-5 font-display text-2xl font-semibold">Crispy. Tasty. Lite.</p><p className="mt-2 max-w-xs text-sm leading-6 text-white/65">Your everyday snack, made better.</p><div className="mt-5 flex gap-3">{socials.map(([href, label, Icon]) => <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} aria-label={label} className={`grid h-10 w-10 place-items-center rounded-full border border-white/25 hover:border-[#E4C46E] ${focus}`}><Icon size={17} aria-hidden="true" /></a>)}</div></section>
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">{columns.map((column) => <section key={column.title}><h2 className="text-[11px] font-bold uppercase tracking-[.18em] text-[#E4C46E]">{column.title}</h2><nav className="mt-4 grid gap-3" aria-label={`${column.title} footer links`}>{column.links.map(([label, to]) => to === '#combo' ? <a key={label} href={to} onClick={openCombo} className={`w-fit text-sm text-white/70 hover:text-white ${focus}`}>{label}</a> : <Link key={label} to={to} className={`w-fit text-sm text-white/70 hover:text-white ${focus}`}>{label}</Link>)}</nav></section>)}</div>
      <section><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#E4C46E]">Get the good stuff first.</p><h2 className="mt-3 font-display text-3xl font-semibold leading-none">New flavours, offers &amp; snack drops.</h2><form onSubmit={subscribe} className="mt-6 flex border-b border-white/35" aria-label="Subscribe to LitePuff updates"><label htmlFor="footer-email" className="sr-only">Email address</label><input id="footer-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/45" /><button type="submit" disabled={loading} className={`grid h-12 w-12 place-items-center text-[#E4C46E] disabled:cursor-wait disabled:opacity-50 ${focus}`} aria-label={loading ? 'Subscribing' : 'Subscribe to newsletter'}><ArrowRight size={19} /></button></form><div className="mt-5 grid gap-2 text-xs text-white/55"><a href={`tel:${siteConfig.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-white"><Phone size={13} aria-hidden="true" />{siteConfig.phone}</a><a href={`mailto:${siteConfig.email}`} className="flex items-center gap-2 hover:text-white"><Mail size={13} aria-hidden="true" />{siteConfig.email}</a></div></section>
    </div>
    <div className="flex flex-col gap-3 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between"><p>© 2026 LitePuff</p><nav className="flex flex-wrap gap-5" aria-label="Legal links"><Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link><Link to="/terms" className="hover:text-white">Terms &amp; Conditions</Link></nav></div>
  </div></footer>;
}
