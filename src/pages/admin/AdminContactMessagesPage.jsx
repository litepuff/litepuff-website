import { useEffect, useState } from 'react';
import AdminDataTable from '../../components/admin/AdminDataTable.jsx';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge.jsx';
import { adminService } from '../../services/adminService';
import { PageTitle } from './AdminProductsPage.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function AdminContactMessagesPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirmAction, showToast } = useToast();

  async function load(search = '') {
    setLoading(true);
    const data = await adminService.messages({ search, limit: 100 });
    setMessages(data.messages || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(id) {
    if (!await confirmAction({ title: 'Delete message?', message: 'This customer message will be permanently removed.', confirmLabel: 'Delete', destructive: true })) return;
    await adminService.deleteMessage(id);
    showToast('Message deleted.');
    load();
  }

  return (
    <section className="grid gap-6">
      <PageTitle eyebrow="Inbox" title="Contact messages" />
      <AdminDataTable
        title="Messages"
        rows={messages}
        loading={loading}
        onSearch={load}
        columns={[
          { key: 'Name', label: 'Name' },
          { key: 'Email', label: 'Email' },
          { key: 'Subject', label: 'Subject' },
          { key: 'Status', label: 'Status', render: (row) => <AdminStatusBadge>{row.Status}</AdminStatusBadge> },
          { key: 'CreatedAt', label: 'Date', render: (row) => String(row.CreatedAt || '').slice(0, 10) }
        ]}
        actions={(row) => <div className="flex gap-2"><button className="admin-action" onClick={() => adminService.markMessageRead(row.MessageID).then(() => load())}>Mark Read</button><a className="admin-action" href={`mailto:${row.Email}`}>Reply</a><button onClick={() => remove(row.MessageID)} className="admin-danger">Delete</button></div>}
      />
    </section>
  );
}
