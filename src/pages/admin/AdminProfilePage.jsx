import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService';
import { PageTitle } from './AdminProductsPage.jsx';

export default function AdminProfilePage() {
  const { admin, logout } = useAuth();
  const [name, setName] = useState(admin?.name || 'LitePuff Admin');
  const [message, setMessage] = useState('');
  const [backups, setBackups] = useState([]);

  async function save(event) {
    event.preventDefault();
    await adminService.updateProfile({ name });
    setMessage('Admin profile updated securely.');
  }

  async function createBackup() {
    const data = await adminService.createBackup();
    setMessage(`Backup created: ${data.backup.fileName}`);
    const list = await adminService.backups();
    setBackups(list.backups || []);
  }

  return (
    <section className="grid gap-6">
      <PageTitle eyebrow="Profile" title="Admin profile" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={save} className="rounded-[24px] border border-brand-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl font-black">Account information</h2>
          {message ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-bold">Name<input className="admin-input" value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="grid gap-2 text-sm font-bold">Email<input className="admin-input" value={admin?.email || ''} disabled /></label>
            <button className="rounded-2xl bg-brand-primary px-5 py-3 text-sm font-black text-white">Save Profile</button>
          </div>
        </form>
        <aside className="rounded-[24px] border border-brand-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl font-black">Security</h2>
          <p className="mt-2 text-sm text-brand-muted">Admin identity and password security are managed through the protected admin database.</p>
          <button onClick={createBackup} className="mt-5 rounded-2xl bg-brand-primary px-5 py-3 text-sm font-black text-white">Create Backup</button>
          <button onClick={logout} className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-3 text-sm font-black text-rose-700">Logout</button>
          {backups.length ? <div className="mt-5 grid gap-2 text-xs text-brand-muted">{backups.slice(0, 5).map((backup) => <span key={backup.BackupID}>{backup.FileName}</span>)}</div> : null}
        </aside>
      </div>
    </section>
  );
}
