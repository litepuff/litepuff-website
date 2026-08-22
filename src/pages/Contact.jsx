import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock, Mail, MessageCircle, PackageSearch, Phone } from 'lucide-react';
import { FiInstagram } from 'react-icons/fi';
import Seo from '../components/Seo.jsx';
import { contentService } from '../services/contentService.js';
import { useToast } from '../context/ToastContext.jsx';
import useMetaTracking from '../analytics/useMetaTracking.js';
import { siteConfig } from '../utils/siteConfig.js';

const reveal = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const whatsappMessage = encodeURIComponent("Hello LitePuff! I'm interested in your products and would like more information.");
const whatsappNumber = String(siteConfig.whatsapp || '').replace(/\D/g, '');
const contacts = [
  { icon: MessageCircle, title: 'WhatsApp', text: 'Quick product and order help.', action: 'Start a Chat', href: `https://wa.me/91${whatsappNumber}?text=${whatsappMessage}` },
  { icon: Mail, title: 'Email', text: 'Detailed questions and feedback.', action: 'Send an Email', href: `mailto:${siteConfig.email}` },
  { icon: Phone, title: 'Phone', text: 'Speak with customer support.', action: 'Call Support', href: `tel:${siteConfig.phone.replace(/\s/g, '')}` },
  { icon: FiInstagram, title: 'Instagram', text: 'Stories, launches and community.', action: 'Follow LitePuff', href: siteConfig.instagram },
];

function Field({ label, name, type = 'text', required = false, autoComplete }) {
  return <label className="relative block"><input name={name} type={type} required={required} autoComplete={autoComplete} placeholder=" " className="peer h-14 w-full rounded-2xl border border-[#DCD4C7] bg-white px-4 pt-4 text-sm text-[#243029] outline-none transition focus:border-[#1E4D3A] focus:ring-2 focus:ring-[#1E4D3A]/10" /><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#68706B] transition-all peer-focus:top-3 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-[0.1em] peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-[10px]">{label}{required ? ' *' : ''}</span></label>;
}

export default function Contact() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const { showToast } = useToast();
  const { trackContact } = useMetaTracking();

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    setLoading(true);
    setStatus({ type: 'idle', message: '' });
    try {
      await contentService.contact(Object.fromEntries(['name', 'email', 'phone', 'subject', 'message'].map((key) => [key, data.get(key)])));
      try { trackContact({ subject: data.get('subject') }); } catch { /* Analytics is optional. */ }
      form.reset();
      setStatus({ type: 'success', message: "Thanks for reaching out. We've received your message and will get back to you shortly." });
      showToast('Message sent successfully.');
    } catch {
      const message = "We couldn't send your message right now. Please try again.";
      setStatus({ type: 'error', message });
      showToast(message, 'error');
    } finally { setLoading(false); }
  }

  return <><Seo title="Let's Talk" description="Contact LitePuff for product questions, order support and feedback." path="/contact" /><main className="bg-[#FAF8F2] text-[#243029]">
    <header className="px-6 py-12 text-center md:py-16 lg:px-8"><motion.div className="mx-auto max-w-4xl" initial="hidden" animate="visible" variants={reveal}><p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C89B3C]">Let&apos;s Talk</p><h1 className="mt-3 font-display text-[46px] font-semibold leading-[0.98] tracking-[-0.04em] md:text-[58px]">We&apos;re Always Happy<br />to Hear From You</h1><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#5F6762]">Questions, feedback or just saying hello — our team is here to help.</p></motion.div></header>

    <section className="px-6 pb-12 md:pb-16 lg:px-8" aria-labelledby="quick-contact-title"><div className="mx-auto max-w-7xl"><h2 id="quick-contact-title" className="sr-only">Quick contact options</h2><motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" initial="hidden" animate="visible">{contacts.map(({ icon: Icon, title, text, action, href }, index) => <motion.article key={title} className="flex flex-col rounded-3xl border border-[#E2DBCF] bg-white p-5" variants={reveal} transition={{ delay: index * 0.04 }} whileHover={{ y: -3 }}><Icon className="h-7 w-7 text-[#C89B3C]" strokeWidth={1.5} aria-hidden="true" /><h3 className="mt-5 font-display text-[27px] font-semibold">{title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-[#5F6762]">{text}</p><a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[#1E4D3A] px-4 text-sm font-semibold text-[#1E4D3A] transition hover:bg-[#1E4D3A] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C]">{action}</a></motion.article>)}</motion.div></div></section>

    <section className="border-y border-[#E2DBCF] bg-white px-6 py-12 md:py-16 lg:px-8" aria-labelledby="contact-form-title"><motion.div className="mx-auto grid max-w-6xl gap-9 lg:grid-cols-[40%_60%] lg:gap-12" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}><motion.div variants={reveal}><p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C89B3C]">Write to Us</p><h2 id="contact-form-title" className="mt-3 font-display text-[42px] font-semibold leading-none tracking-[-0.04em] md:text-[48px]">Tell us what&apos;s on your mind.</h2><p className="mt-4 max-w-md text-base leading-7 text-[#5F6762]">Share a product question, order concern, partnership idea or honest feedback. We&apos;ll make sure it reaches the right person.</p><div className="mt-7 rounded-3xl bg-[#F3EFE6] p-5"><Clock className="text-[#C89B3C]" strokeWidth={1.5} aria-hidden="true" /><p className="mt-3 text-sm font-semibold">Typical response time</p><p className="mt-1 text-sm text-[#5F6762]">Within one business day.</p></div></motion.div>
      <motion.form onSubmit={submit} className="grid gap-4 rounded-3xl bg-[#FAF8F2] p-5 sm:p-7" variants={reveal} aria-label="Contact LitePuff"><div className="grid gap-4 sm:grid-cols-2"><Field label="Full Name" name="name" required autoComplete="name" /><Field label="Email" name="email" type="email" required autoComplete="email" /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Phone" name="phone" type="tel" autoComplete="tel" /><label className="relative block"><select name="subject" required defaultValue="" className="h-14 w-full appearance-none rounded-2xl border border-[#DCD4C7] bg-white px-4 pt-3 text-sm outline-none focus:border-[#1E4D3A] focus:ring-2 focus:ring-[#1E4D3A]/10"><option value="" disabled>Select subject</option><option>Order Support</option><option>Product Question</option><option>Feedback</option><option>Bulk Order</option><option>Partnership</option><option>Other</option></select><span className="absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#68706B]">Subject *</span></label></div><label className="relative block"><textarea name="message" required placeholder=" " className="peer h-40 w-full resize-y rounded-2xl border border-[#DCD4C7] bg-white px-4 pb-3 pt-6 text-sm leading-6 outline-none focus:border-[#1E4D3A] focus:ring-2 focus:ring-[#1E4D3A]/10" /><span className="pointer-events-none absolute left-4 top-5 text-sm text-[#68706B] transition-all peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-[0.1em] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[10px]">Message *</span></label>{status.message ? <p role={status.type === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${status.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>{status.message}</p> : null}<button disabled={loading} className="h-13 rounded-full bg-[#1E4D3A] text-base font-semibold text-white transition hover:bg-[#28624F] disabled:cursor-wait disabled:opacity-60">{loading ? 'Sending…' : 'Send Message'}</button></motion.form>
    </motion.div></section>

    <section className="px-6 py-12 md:py-16 lg:px-8" aria-labelledby="support-title"><div className="mx-auto max-w-7xl"><div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C89B3C]">Customer Support</p><h2 id="support-title" className="mt-2 font-display text-[42px] font-semibold leading-none">Helpful details, upfront.</h2></div><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[[Clock, 'Response Time', 'Within one business day'], [Mail, 'Business Email', siteConfig.email], [Phone, 'Phone Support', siteConfig.phone], [PackageSearch, 'Order Support', 'Tracking, delivery and returns']].map(([Icon, title, text]) => <article key={title} className="border-t border-[#D8CFBF] py-5"><Icon className="text-[#C89B3C]" size={23} strokeWidth={1.5} aria-hidden="true" /><h3 className="mt-4 font-display text-2xl font-semibold">{title}</h3><p className="mt-2 break-words text-sm leading-6 text-[#5F6762]">{text}</p></article>)}</div><div className="mt-8 grid gap-5 rounded-3xl border border-[#E2DBCF] bg-white p-6 md:grid-cols-[1fr_auto] md:items-center"><div><h2 className="font-display text-3xl font-semibold">Business Hours</h2><p className="mt-2 text-sm text-[#5F6762]">{siteConfig.businessHours}</p></div><div className="flex gap-2" aria-label="LitePuff social links">{contacts.filter((item) => ['WhatsApp', 'Email', 'Instagram'].includes(item.title)).map(({ title, href, icon: Icon }) => <a key={title} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="grid h-11 w-11 place-items-center rounded-full border border-[#1E4D3A] text-[#1E4D3A] hover:bg-[#1E4D3A] hover:text-white" aria-label={title}><Icon size={19} aria-hidden="true" /></a>)}</div></div><aside className="mt-8 rounded-3xl bg-[#1E4D3A] p-7 text-center text-white"><h2 className="font-display text-[34px] font-semibold">Need more help?</h2><p className="mt-2 text-sm text-white/75">Browse clear answers about products, orders, shipping and returns.</p><Link to="/faq" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#FAF8F2] px-6 text-sm font-semibold text-[#1E4D3A]">Visit Help Center</Link></aside></div></section>
  </main></>;
}
