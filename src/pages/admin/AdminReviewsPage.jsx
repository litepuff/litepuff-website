import { useEffect, useState } from 'react';
import AdminDataTable from '../../components/admin/AdminDataTable.jsx';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge.jsx';
import { adminService } from '../../services/adminService';
import { PageTitle } from './AdminProductsPage.jsx';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

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

  async function remove(id) {
    if (!window.confirm('Delete this review?')) return;
    await adminService.deleteReview(id);
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
          { key: 'Rating', label: 'Rating', render: (row) => `${row.Rating} / 5` },
          { key: 'Title', label: 'Title' },
          { key: 'ProductID', label: 'Product' },
          { key: 'Status', label: 'Status', render: (row) => <AdminStatusBadge>{row.Status}</AdminStatusBadge> },
          { key: 'CreatedAt', label: 'Date', render: (row) => String(row.CreatedAt || '').slice(0, 10) }
        ]}
        actions={(row) => <div className="flex gap-2"><button onClick={() => update(row.ReviewID, 'active')} className="admin-action">Approve</button><button onClick={() => update(row.ReviewID, 'rejected')} className="admin-action">Reject</button><button onClick={() => remove(row.ReviewID)} className="admin-danger">Delete</button></div>}
      />
    </section>
  );
}
