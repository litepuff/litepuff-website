import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Mail, MessageCircle } from 'lucide-react';
import { contentService } from '../services/contentService';
import { useToast } from '../context/ToastContext';

const reveal = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

const notificationOptions = [
  { title: 'WhatsApp Updates', description: 'Get launch alerts and useful LitePuff updates where you already chat.', button: 'Notify on WhatsApp', icon: MessageCircle },
  { title: 'Email Updates', description: 'Receive new flavours, offers and thoughtful snack inspiration by email.', button: 'Subscribe via Email', icon: Mail },
  { title: 'Browser Notifications', description: 'See timely product news without sharing another contact detail.', button: 'Enable Notifications', icon: Bell },
];

export default function StayConnected() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef(null);
  const { showToast } = useToast();

  const subscribe = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await contentService.newsletter(email);
      setEmail('');
      showToast('You’re subscribed to LitePuff updates.');
    } catch {
      showToast('Unable to subscribe right now.', 'error');
    } finally { setLoading(false); }
  };

  const handleNotification = (title) => {
    if (title === 'Email Updates') {
      emailInputRef.current?.focus();
      emailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    showToast(`${title} will be available soon.`);
  };

  return (
    <section className="bg-[#FAF8F2] px-6 py-12 md:py-16 lg:px-8 lg:py-20" aria-labelledby="stay-connected-title">
      <div className="mx-auto max-w-7xl">
        <motion.div className="mx-auto max-w-[960px] rounded-[30px] border border-[#E8E1D6] bg-white px-5 py-9 text-center shadow-[0_18px_55px_rgba(36,48,41,0.06)] sm:px-8 md:px-12 md:py-12" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={reveal}>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C89B3C]">The LitePuff Community</p>
          <h2 id="stay-connected-title" className="mt-3 font-display text-[44px] font-semibold leading-none tracking-[-0.04em] text-[#243029] md:text-[48px]">Stay Connected with LitePuff</h2>
          <p className="mx-auto mt-4 max-w-[680px] text-base leading-7 text-[#5F6762] md:text-lg">Be the first to discover new flavours, limited editions, exclusive offers and healthy snacking tips.</p>
          <form className="mx-auto mt-8 grid max-w-[680px] gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={subscribe} aria-label="Subscribe to LitePuff email updates">
            <label htmlFor="litepuff-newsletter-email" className="sr-only">Email address</label>
            <input ref={emailInputRef} id="litepuff-newsletter-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email address" className="h-14 min-w-0 rounded-2xl border border-[#DCD4C7] bg-[#FAF8F2] px-5 text-base text-[#243029] outline-none transition-colors focus:border-[#1E4D3A]" />
            <button type="submit" disabled={loading} className="h-14 shrink-0 rounded-2xl bg-[#1E4D3A] px-8 text-sm font-bold text-white shadow-[0_8px_20px_rgba(30,77,58,0.16)] transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:bg-[#2C614A] disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Subscribing…' : 'Subscribe'}</button>
          </form>
          <p className="mt-4 text-xs text-[#777D79]">We&apos;ll only send useful updates. No spam.</p>
        </motion.div>

        <motion.div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.12 }} variants={stagger} aria-label="Choose how to receive LitePuff updates">
          {notificationOptions.map(({ title, description, button, icon: Icon }) => <motion.article key={title} className="flex h-full flex-col rounded-[24px] border border-[#E2DBCF] bg-white p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(36,48,41,0.06)]" variants={reveal}><Icon className="h-7 w-7 text-[#C89B3C]" strokeWidth={1.5} aria-hidden="true" /><h3 className="mt-5 font-display text-[28px] font-semibold leading-tight text-[#243029]">{title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-[#5F6762]">{description}</p><button type="button" onClick={() => handleNotification(title)} className="mt-6 h-12 w-full rounded-full border border-[#1E4D3A] text-sm font-semibold text-[#1E4D3A] transition-[transform,background-color,color] duration-300 hover:-translate-y-0.5 hover:bg-[#1E4D3A] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C]">{button}</button></motion.article>)}
        </motion.div>
      </div>
    </section>
  );
}
