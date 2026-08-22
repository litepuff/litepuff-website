import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BarChart3, BookOpen, Boxes, ChevronRight, CircleUserRound, ClipboardList, ContactRound, LayoutDashboard, LogOut, Mail, Menu, Percent, ShoppingBag, Star, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const groups = [
  { label: 'Overview', items: [['Dashboard', '/admin/dashboard', LayoutDashboard]] },
  { label: 'Commerce', items: [['Orders', '/admin/orders', ClipboardList], ['Products', '/admin/products', ShoppingBag], ['Inventory', '/admin/inventory', Boxes], ['Coupons', '/admin/coupons', Percent]] },
  { label: 'Customers', items: [['Customers', '/admin/customers', Users], ['Reviews', '/admin/reviews', Star]] },
  { label: 'Content', items: [['Blogs', '/admin/blogs', BookOpen], ['Contact messages', '/admin/contact-messages', ContactRound], ['Newsletter', '/admin/newsletter', Mail]] },
  { label: 'Insights', items: [['Analytics & reports', '/admin/analytics', BarChart3]] },
  { label: 'System', items: [['Admin profile', '/admin/profile', CircleUserRound]] },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  function handleLogout() { logout(); navigate('/admin/login'); }

  const sidebar = (
    <aside className="flex h-full w-[min(272px,88vw)] flex-col overflow-y-auto border-r border-brand-border bg-white px-4 py-5">
      <div className="flex items-start justify-between gap-4 px-2">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-accent">LitePuff</p><h1 className="mt-1 font-display text-2xl font-semibold text-brand-text">Operations</h1></div>
        <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl text-brand-muted hover:bg-brand-background lg:hidden" aria-label="Close admin navigation"><X size={19} /></button>
      </div>
      <nav className="mt-7 grid gap-6" aria-label="Admin navigation">
        {groups.map((group) => <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-muted">{group.label}</p>
          <div className="grid gap-1">{group.items.map(([label, path, Icon]) => <NavLink key={path} to={path} className={({ isActive }) => `group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive || (path === '/admin/dashboard' && location.pathname === '/admin') ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-muted hover:bg-brand-background hover:text-brand-text'}`}><Icon size={18} aria-hidden="true" /><span className="flex-1">{label}</span><ChevronRight size={15} className="opacity-0 transition group-hover:opacity-60" aria-hidden="true" /></NavLink>)}</div>
        </div>)}
      </nav>
      <button type="button" onClick={handleLogout} className="mt-8 flex min-h-11 items-center gap-3 rounded-xl border border-brand-border px-3 py-2.5 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50"><LogOut size={18} />Logout</button>
    </aside>
  );

  return <div className="min-h-screen overflow-x-hidden bg-brand-background text-brand-text">
    <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</div>
    <header className="sticky top-0 z-20 flex min-h-[68px] items-center justify-between gap-3 border-b border-brand-border bg-brand-background/95 px-4 py-3 backdrop-blur lg:ml-[272px] lg:px-8">
      <button type="button" onClick={() => setOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-brand-border bg-white lg:hidden" aria-label="Open admin navigation" aria-expanded={open}><Menu size={20} /></button>
      <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-accent">Business management</p><h2 className="truncate font-display text-lg font-semibold sm:text-xl">LitePuff control room</h2></div>
      <div className="hidden min-w-0 text-right sm:block"><p className="truncate text-sm font-semibold">{admin?.name || 'Admin'}</p><p className="max-w-52 truncate text-xs text-brand-muted">{admin?.email}</p></div>
    </header>
    <main className="min-w-0 px-4 py-5 sm:px-6 lg:ml-[272px] lg:px-8 lg:py-7"><Outlet /></main>
    <AnimatePresence>{open ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-brand-text/35 lg:hidden" onClick={() => setOpen(false)}><motion.div initial={reduceMotion ? false : { x: -272 }} animate={{ x: 0 }} exit={reduceMotion ? { opacity: 0 } : { x: -272 }} transition={{ duration: reduceMotion ? 0 : 0.22 }} className="h-full" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Admin navigation">{sidebar}</motion.div></motion.div> : null}</AnimatePresence>
  </div>;
}
