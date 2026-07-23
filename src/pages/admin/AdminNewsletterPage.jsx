import { useEffect, useState } from 'react';
import AdminDataTable from '../../components/admin/AdminDataTable.jsx';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge.jsx';
import { adminService } from '../../services/adminService';
import { PageTitle } from './AdminProductsPage.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirmAction, showToast } = useToast();

  async function load(search = '') {
    setLoading(true);
    const data = await adminService.newsletter({ search, limit: 100 });
    setSubscribers(data.subscribers || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(id) {
    if (!await confirmAction({ title: 'Remove subscriber?', message: 'This email will be removed from the newsletter list.', confirmLabel: 'Remove', destructive: true })) return;
    await adminService.deleteSubscriber(id);
    showToast('Subscriber removed.');
    load();
  }

  async function exportCsv() {
    const blob = await adminService.exportNewsletter();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'litepuff-newsletter.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="grid gap-6">
      <PageTitle eyebrow="Newsletter" title="Subscriber management">
        <button onClick={exportCsv} className="rounded-2xl bg-brand-primary px-5 py-3 text-sm font-black text-white">Export CSV</button>
      </PageTitle>
      <AdminDataTable
        title="Subscribers"
        rows={subscribers}
        loading={loading}
        onSearch={load}
        columns={[
          { key: 'Email', label: 'Email' },
          { key: 'SubscribedAt', label: 'Subscribed', render: (row) => String(row.SubscribedAt || '').slice(0, 10) },
          { key: 'Status', label: 'Status', render: (row) => <AdminStatusBadge>{row.Status}</AdminStatusBadge> }
        ]}
        actions={(row) => <button onClick={() => remove(row.SubscriberID)} className="admin-danger">Delete</button>}
      />
    </section>
  );
}
