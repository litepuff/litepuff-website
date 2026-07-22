import { useEffect, useState } from 'react';
import AdminDataTable from '../../components/admin/AdminDataTable.jsx';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge.jsx';
import { adminService } from '../../services/adminService';
import { PageTitle } from './AdminProductsPage.jsx';

const emptyCoupon = { code: '', type: 'percent', value: '', minOrder: 0, maxDiscount: '', expiry: '', usageLimit: '', status: 'active' };

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(emptyCoupon);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(search = '') {
    setLoading(true);
    const data = await adminService.coupons({ search, limit: 100 });
    setCoupons(data.coupons || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(event) {
    event.preventDefault();
    if (editingId) await adminService.updateCoupon(editingId, form);
    else await adminService.createCoupon(form);
    setForm(emptyCoupon);
    setEditingId('');
    load();
  }

  async function remove(id) {
    if (!window.confirm('Delete this coupon?')) return;
    await adminService.deleteCoupon(id);
    load();
  }

  return (
    <section className="grid gap-6">
      <PageTitle eyebrow="Coupons" title="Coupon management" />
      <form onSubmit={save} className="grid gap-3 rounded-[24px] border border-brand-border bg-white p-5 shadow-sm md:grid-cols-4">
        <input required placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="admin-input" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="admin-input"><option value="percent">Percentage</option><option value="fixed">Fixed Amount</option><option value="shipping">Free Shipping</option></select>
        <input placeholder="Value" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="admin-input" />
        <input placeholder="Min order" type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} className="admin-input" />
        <input placeholder="Max discount" type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} className="admin-input" />
        <input type="date" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} className="admin-input" />
        <input placeholder="Usage limit" type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className="admin-input" />
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="admin-input"><option value="active">Active</option><option value="inactive">Disabled</option></select>
        <button className="rounded-2xl bg-brand-primary px-5 py-3 text-sm font-black text-white md:col-span-4">{editingId ? 'Update Coupon' : 'Create Coupon'}</button>
      </form>
      <AdminDataTable
        title="Coupons"
        rows={coupons}
        loading={loading}
        onSearch={load}
        columns={[
          { key: 'Code', label: 'Code' },
          { key: 'Type', label: 'Type' },
          { key: 'Value', label: 'Value' },
          { key: 'UsedCount', label: 'Used' },
          { key: 'Status', label: 'Status', render: (row) => <AdminStatusBadge>{row.Status}</AdminStatusBadge> }
        ]}
        actions={(row) => <div className="flex gap-2"><button className="admin-action" onClick={() => { setEditingId(row.CouponID); setForm({ code: row.Code, type: row.Type, value: row.Value, minOrder: row.MinOrder, maxDiscount: row.MaxDiscount, expiry: row.Expiry, usageLimit: row.UsageLimit, status: row.Status }); }}>Edit</button><button onClick={() => remove(row.CouponID)} className="admin-danger">Delete</button></div>}
      />
    </section>
  );
}
