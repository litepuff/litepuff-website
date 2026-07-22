import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Seo from '../../components/Seo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: 'admin@everydaymakhana.com', password: 'admin123' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(formData.email, formData.password);
      navigate('/admin/dashboard');
    } catch {
      setError('Invalid admin login. Check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Seo title="Admin Login" description="LitePuff business management login." path="/admin/login" />
      <section className="flex min-h-screen items-center justify-center bg-brand-background p-5">
        <motion.form initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} onSubmit={handleSubmit} className="w-full max-w-md rounded-[32px] border border-brand-border bg-white p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-brand-accent">LitePuff Admin</p>
          <h1 className="mt-3 font-display text-4xl font-black text-brand-text">Welcome back.</h1>
          <p className="mt-2 text-sm text-brand-muted">Manage products, orders, customers and the business from one secure dashboard.</p>
          {error ? <p className="mt-5 rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-brand-text">
              Email
              <input className="rounded-2xl border border-brand-border bg-brand-background px-4 py-3 outline-none transition focus:border-brand-primary" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} />
            </label>
            <label className="grid gap-2 text-sm font-bold text-brand-text">
              Password
              <input className="rounded-2xl border border-brand-border bg-brand-background px-4 py-3 outline-none transition focus:border-brand-primary" value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} type="password" />
            </label>
            <button disabled={loading} className="rounded-2xl bg-brand-primary px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:opacity-60">{loading ? 'Signing in...' : 'Sign In'}</button>
          </div>
        </motion.form>
      </section>
    </>
  );
}
