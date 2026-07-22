import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';

const menu = [
  ['Dashboard', '/admin/dashboard'],
  ['Products', '/admin/products'],
  ['Orders', '/admin/orders'],
  ['Customers', '/admin/customers'],
  ['Inventory', '/admin/inventory'],
  ['Reviews', '/admin/reviews'],
  ['Blogs', '/admin/blogs'],
  ['Coupons', '/admin/coupons'],
  ['Contact Messages', '/admin/contact-messages'],
  ['Newsletter', '/admin/newsletter'],
  ['Analytics', '/admin/analytics'],
  ['Admin Profile', '/admin/profile']
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  const sidebar = (
    <aside className="flex h-full w-[280px] flex-col border-r border-brand-border bg-white px-5 py-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-brand-accent">LitePuff</p>
        <h1 className="mt-2 font-display text-3xl font-black text-brand-text">Admin</h1>
      </div>
      <nav className="mt-8 grid gap-1">
        {menu.map(([label, path]) => (
          <NavLink key={path} to={path} onClick={() => setOpen(false)} className={({ isActive }) => `rounded-2xl px-4 py-3 text-sm font-bold transition ${isActive || (path === '/admin/dashboard' && location.pathname === '/admin') ? 'bg-brand-primary text-white' : 'text-brand-muted hover:bg-brand-background hover:text-brand-text'}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <button onClick={handleLogout} className="mt-auto rounded-2xl border border-brand-border px-4 py-3 text-left text-sm font-black text-rose-700 transition hover:bg-rose-50">Logout</button>
    </aside>
  );

  return (
    <div className="min-h-screen bg-brand-background text-brand-text">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</div>

      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-brand-border bg-brand-background/95 px-4 backdrop-blur lg:ml-[280px] lg:px-8">
        <button onClick={() => setOpen(true)} className="rounded-2xl border border-brand-border bg-white px-4 py-2 text-sm font-bold lg:hidden">Menu</button>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-accent">Business Management</p>
          <h2 className="font-display text-2xl font-black">LitePuff Control Room</h2>
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-bold">{admin?.name || 'Admin'}</p>
          <p className="text-xs text-brand-muted">{admin?.email}</p>
        </div>
      </header>

      <main className="px-4 py-6 lg:ml-[280px] lg:px-8">
        <Outlet />
      </main>

      <AnimatePresence>
        {open ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-brand-text/30 lg:hidden" onClick={() => setOpen(false)}>
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ duration: 0.3 }} className="h-full" onClick={(event) => event.stopPropagation()}>
              {sidebar}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
