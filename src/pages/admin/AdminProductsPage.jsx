import { useEffect, useState } from 'react';
import AdminDataTable from '../../components/admin/AdminDataTable.jsx';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge.jsx';
import { adminService } from '../../services/adminService';
import { formatMoney } from '../../utils/formatMoney';
import { useToast } from '../../context/ToastContext.jsx';
import { DEFAULT_OFFER_CONFIG } from '../../../shared/offerConfig.js';

const emptyProduct = { name: '', metaCatalogId: '', category: 'Makhana', flavor: '', price: '', discountPrice: '', stock: 0, status: 'active', featured: false, bestSeller: false, primaryImage: '', nutritionPDF: '', shortDescription: '' };

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState(DEFAULT_OFFER_CONFIG);
  const { confirmAction, showToast } = useToast();

  async function load(search = '') {
    setLoading(true);
    const data = await adminService.products({ search, limit: 100 });
    setProducts(data.products || []);
    setLoading(false);
  }

  useEffect(() => { load(); adminService.offers().then((data) => setOffers(data.offers || DEFAULT_OFFER_CONFIG)); }, []);

  async function saveOffers(event) {
    event.preventDefault();
    const data = await adminService.updateOffers(offers);
    setOffers(data.offers);
    showToast('Offer configuration updated.');
  }

  async function save(event) {
    event.preventDefault();
    if (editingId) await adminService.updateProduct(editingId, form);
    else await adminService.createProduct(form);
    setForm(emptyProduct);
    setEditingId('');
    load();
  }

  async function remove(id) {
    if (!await confirmAction({ title: 'Delete product?', message: 'This product will be removed from the catalogue.', confirmLabel: 'Delete', destructive: true })) return;
    await adminService.deleteProduct(id);
    showToast('Product deleted.');
    load();
  }

  return (
    <section className="grid gap-6">
      <PageTitle eyebrow="Products" title="Product management" />
      <form onSubmit={saveOffers} className="grid gap-3 rounded-[24px] border border-brand-border bg-white p-5 shadow-sm md:grid-cols-3">
        <h2 className="font-display text-2xl font-bold md:col-span-3">Store offers</h2>
        <label className="text-sm font-bold">Single product discount %<input type="number" min="0" max="100" value={offers.singleDiscountPercent} onChange={(e) => setOffers({ ...offers, singleDiscountPercent: Number(e.target.value) })} className="admin-input mt-2 w-full" /></label>
        {[['combo2', '2-product combo'], ['combo3', '3-product combo']].map(([key, label]) => <fieldset key={key} className="grid gap-2 rounded-2xl border border-brand-border p-4"><legend className="px-2 font-bold">{label}</legend><label className="text-sm">Price<input type="number" min="1" value={offers[key].price} onChange={(e) => setOffers({ ...offers, [key]: { ...offers[key], price: Number(e.target.value) } })} className="admin-input mt-1 w-full" /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={offers[key].enabled} onChange={(e) => setOffers({ ...offers, [key]: { ...offers[key], enabled: e.target.checked } })} /> Enabled</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={offers[key].freeDelivery} onChange={(e) => setOffers({ ...offers, [key]: { ...offers[key], freeDelivery: e.target.checked } })} /> Free delivery</label></fieldset>)}
        <button className="rounded-2xl bg-brand-primary px-5 py-3 text-sm font-black text-white">Save Offers</button>
      </form>
      <form onSubmit={save} className="grid gap-3 rounded-[24px] border border-brand-border bg-white p-5 shadow-sm md:grid-cols-3">
        <input required placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="admin-input" />
        <input placeholder="Meta Catalogue ID" value={form.metaCatalogId} onChange={(e) => setForm({ ...form, metaCatalogId: e.target.value })} onBlur={(e) => setForm({ ...form, metaCatalogId: e.target.value.trim() })} className="admin-input" />
        <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="admin-input" />
        <input placeholder="Flavor" value={form.flavor} onChange={(e) => setForm({ ...form, flavor: e.target.value })} className="admin-input" />
        <input placeholder="Price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="admin-input" />
        <input placeholder="Discount price" type="number" value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: e.target.value })} className="admin-input" />
        <input placeholder="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="admin-input" />
        <input placeholder="Primary image URL" value={form.primaryImage} onChange={(e) => setForm({ ...form, primaryImage: e.target.value })} className="admin-input" />
        <input placeholder="Nutrition PDF URL" value={form.nutritionPDF} onChange={(e) => setForm({ ...form, nutritionPDF: e.target.value })} className="admin-input" />
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="admin-input"><option value="active">Active</option><option value="coming_soon">Coming Soon</option><option value="inactive">Inactive</option></select>
        <textarea placeholder="Short description" value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} className="admin-input md:col-span-3" />
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.bestSeller} onChange={(e) => setForm({ ...form, bestSeller: e.target.checked })} /> Best Seller</label>
        <button className="rounded-2xl bg-brand-primary px-5 py-3 text-sm font-black text-white">{editingId ? 'Update Product' : 'Add Product'}</button>
      </form>
      <AdminDataTable
        title="Products"
        description="Search, edit, duplicate, publish and manage stock."
        rows={products}
        loading={loading}
        onSearch={load}
        columns={[
          { key: 'name', label: 'Product' },
          { key: 'category', label: 'Category' },
          { key: 'metaCatalogId', label: 'Meta Catalogue ID' },
          { key: 'price', label: 'Price', render: (row) => formatMoney(row.price) },
          { key: 'stock', label: 'Stock' },
          { key: 'status', label: 'Status', render: (row) => <AdminStatusBadge>{row.status}</AdminStatusBadge> }
        ]}
        actions={(row) => (
          <div className="flex gap-2">
            <button onClick={() => { setEditingId(row.id); setForm({ ...emptyProduct, ...row }); }} className="admin-action">Edit</button>
            <button onClick={() => adminService.duplicateProduct(row.id).then(() => load())} className="admin-action">Duplicate</button>
            <button onClick={() => remove(row.id)} className="admin-danger">Delete</button>
          </div>
        )}
      />
    </section>
  );
}

export function PageTitle({ eyebrow, title, children }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.24em] text-brand-accent">{eyebrow}</p><h1 className="font-display text-4xl font-black text-brand-text">{title}</h1></div>{children}</div>;
}
