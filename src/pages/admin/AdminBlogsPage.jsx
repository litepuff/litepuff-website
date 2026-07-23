import { useEffect, useState } from 'react';
import AdminDataTable from '../../components/admin/AdminDataTable.jsx';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge.jsx';
import { adminService } from '../../services/adminService';
import { PageTitle } from './AdminProductsPage.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const emptyBlog = { title: '', category: 'Stories', author: 'LitePuff', coverImage: '', excerpt: '', content: '', readingTime: '', tags: '', featured: false, status: 'draft' };

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState([]);
  const [form, setForm] = useState(emptyBlog);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const { confirmAction, showToast } = useToast();

  async function load(search = '') {
    setLoading(true);
    const data = await adminService.blogs({ search, limit: 100 });
    setBlogs(data.blogs || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(event) {
    event.preventDefault();
    if (editingId) await adminService.updateBlog(editingId, form);
    else await adminService.createBlog(form);
    setForm(emptyBlog);
    setEditingId('');
    load();
  }

  async function remove(id) {
    if (!await confirmAction({ title: 'Delete article?', message: 'This journal article will be permanently removed.', confirmLabel: 'Delete', destructive: true })) return;
    await adminService.deleteBlog(id);
    showToast('Article deleted.');
    load();
  }

  return (
    <section className="grid gap-6">
      <PageTitle eyebrow="Blogs" title="Blog management" />
      <form onSubmit={save} className="grid gap-3 rounded-[24px] border border-brand-border bg-white p-5 shadow-sm md:grid-cols-2">
        <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="admin-input" />
        <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="admin-input" />
        <input placeholder="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="admin-input" />
        <input placeholder="Reading time" value={form.readingTime} onChange={(e) => setForm({ ...form, readingTime: e.target.value })} className="admin-input" />
        <input placeholder="Cover image URL" value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} className="admin-input md:col-span-2" />
        <input placeholder="Tags comma separated" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="admin-input md:col-span-2" />
        <textarea placeholder="Excerpt" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="admin-input md:col-span-2" />
        <textarea placeholder="Content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="admin-input min-h-36 md:col-span-2" />
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="admin-input"><option value="draft">Draft</option><option value="published">Published</option></select>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
        <button className="rounded-2xl bg-brand-primary px-5 py-3 text-sm font-black text-white md:col-span-2">{editingId ? 'Update Blog' : 'Create Blog'}</button>
      </form>
      <AdminDataTable
        title="Blogs"
        rows={blogs}
        loading={loading}
        onSearch={load}
        columns={[
          { key: 'Title', label: 'Title' },
          { key: 'Category', label: 'Category' },
          { key: 'Author', label: 'Author' },
          { key: 'Status', label: 'Status', render: (row) => <AdminStatusBadge>{row.Status}</AdminStatusBadge> },
          { key: 'PublishedDate', label: 'Published', render: (row) => String(row.PublishedDate || '').slice(0, 10) }
        ]}
        actions={(row) => <div className="flex gap-2"><button className="admin-action" onClick={() => { setEditingId(row.BlogID); setForm({ ...emptyBlog, title: row.Title, category: row.Category, author: row.Author, coverImage: row.CoverImage, excerpt: row.Excerpt, content: row.Content, readingTime: row.ReadingTime, tags: row.Tags, featured: row.Featured === true || row.Featured === 'true', status: row.Status }); }}>Edit</button><button onClick={() => remove(row.BlogID)} className="admin-danger">Delete</button></div>}
      />
    </section>
  );
}
