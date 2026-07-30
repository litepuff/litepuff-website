import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiSearch, FiX } from 'react-icons/fi';
import { contentService } from '../services/contentService';
import useMetaTracking from '../analytics/useMetaTracking.js';

export default function SearchOverlay({ open, onClose }) {
  const { trackSearch } = useMetaTracking();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ products: [], blogs: [], faqs: [] });
  const [selected, setSelected] = useState(0);
  const [recent, setRecent] = useState(() => JSON.parse(localStorage.getItem('litepuffRecentSearches') || '[]'));
  const flat = useMemo(() => [...results.products.map((item) => ({ type: 'Product', label: item.name, to: `/products/${item.slug}` })), ...results.blogs.map((item) => ({ type: 'Blog', label: item.title, to: `/blog/${item.slug}` })), ...results.faqs.map((item) => ({ type: 'FAQ', label: item.question, to: '/contact' }))], [results]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      if (query.trim()) contentService.search(query.trim()).then(setResults).catch(() => setResults({ products: [], blogs: [], faqs: [] }));
      else setResults({ products: [], blogs: [], faqs: [] });
    }, 180);
    return () => window.clearTimeout(id);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowDown') { event.preventDefault(); setSelected((value) => Math.min(value + 1, Math.max(flat.length - 1, 0))); }
      if (event.key === 'ArrowUp') { event.preventDefault(); setSelected((value) => Math.max(value - 1, 0)); }
      if (event.key === 'Enter' && flat[selected]) {
        event.preventDefault();
        remember();
        try { trackSearch(query); } catch { /* Analytics is optional. */ }
        window.location.href = flat[selected].to;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flat, selected, onClose, query, recent, trackSearch]);

  const remember = () => {
    if (!query.trim()) return;
    const next = [query.trim(), ...recent.filter((item) => item !== query.trim())].slice(0, 5);
    setRecent(next);
    localStorage.setItem('litepuffRecentSearches', JSON.stringify(next));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] bg-[#243029]/45 px-4 pt-24" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} transition={{ duration: 0.3 }} className="mx-auto max-w-3xl rounded-[30px] bg-[#FAF8F2] p-5 shadow-2xl">
            <div className="flex items-center gap-3 rounded-2xl border border-[#DCD5C9] bg-white px-5 transition-[border-color,box-shadow] duration-200 focus-within:border-[#1E4D3A] focus-within:shadow-[0_0_0_4px_rgba(30,77,58,0.10)]">
              <FiSearch className="text-[#1E4D3A]" />
              <input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setSelected(0); }} onBlur={remember} placeholder="Search products, stories, FAQs…" className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none ring-0" />
              <button onClick={onClose} aria-label="Close search" className="text-[#1E4D3A]"><FiX /></button>
            </div>
            {!query && recent.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{recent.map((item) => <button key={item} onClick={() => setQuery(item)} className="rounded-full border border-[#ECE7DD] bg-white px-4 py-2 text-sm">{item}</button>)}</div>}
            <div className="mt-5 max-h-[55vh] overflow-y-auto">
              {query && flat.length === 0 ? <div className="rounded-2xl bg-white p-8 text-center text-[#6B726D]">No results found.</div> : flat.map((item, index) => (
                <Link key={`${item.type}-${item.label}`} to={item.to} onClick={() => { remember(); try { trackSearch(query); } catch { /* Analytics is optional. */ } onClose(); }} className={`mb-2 flex items-center justify-between rounded-2xl border p-4 text-sm ${selected === index ? 'border-[#1E4D3A] bg-white' : 'border-[#ECE7DD] bg-white/70'}`}>
                  <span>{item.label}</span><span className="text-xs font-bold uppercase tracking-[0.16em] text-[#C89B3C]">{item.type}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
