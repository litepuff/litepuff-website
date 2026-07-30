import { useEffect, useState } from 'react';
import AdminDataTable from '../../components/admin/AdminDataTable.jsx';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge.jsx';
import { adminService } from '../../services/adminService';
import { PageTitle } from './AdminProductsPage.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirmAction, promptAction, showToast } = useToast();

  async function load(search = '') {
    setLoading(true);
    const data = await adminService.reviews({ search, limit: 100 });
    setReviews(data.reviews || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function update(id, status) {
    await adminService.updateReview(id, status);
    load();
  }

  async function reply(id) {
    const message = await promptAction({ title: 'Official LitePuff reply', placeholder: 'Write a public reply…', confirmLabel: 'Publish' });
    if (!message) return;
    await adminService.replyReview(id, message);
    showToast('Reply published.');
    load();
  }

  async function remove(id) {
    if (!await confirmAction({ title: 'Delete review?', message: 'This review will be permanently removed.', confirmLabel: 'Delete', destructive: true })) return;
    await adminService.deleteReview(id);
    showToast('Review deleted.');
    load();
  }

  return (
    <section className="grid gap-6">
      <PageTitle eyebrow="Reviews" title="Review moderation" />
      <AdminDataTable
        title="Reviews"
        rows={reviews}
        loading={loading}
        onSearch={load}
        columns={[
          { key: 'rating', label: 'Rating', render: (row) => `${row.rating} / 5` },
          { key: 'title', label: 'Title' },
          { key: 'productId', label: 'Product' },
          { key: 'status', label: 'Status', render: (row) => <AdminStatusBadge>{row.status}</AdminStatusBadge> },
          { key: 'createdAt', label: 'Date', render: (row) => String(row.createdAt || '').slice(0, 10) }
        ]}
        actions={(row) => <div className="flex flex-wrap gap-2"><button onClick={() => update(row.id, { status: 'approved' })} className="admin-action">Approve</button><button onClick={() => update(row.id, { status: 'rejected' })} className="admin-action">Reject</button><button onClick={() => update(row.id, { status: 'spam' })} className="admin-action">Spam</button><button onClick={() => update(row.id, { featured: !row.featured })} className="admin-action">{row.featured ? 'Unpin' : 'Pin'}</button><button onClick={() => reply(row.id)} className="admin-action">Reply</button><button onClick={() => update(row.id, { banUser: true })} className="admin-danger">Ban User</button><button onClick={() => remove(row.id)} className="admin-danger">Delete</button></div>}
      />
    </section>
  );
}
