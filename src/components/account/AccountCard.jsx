import { useEffect, useState } from 'react';
import { FiEdit3, FiLogOut, FiX } from 'react-icons/fi';
import FormField from './FormField';

export default function AccountCard({ customer, editing, onEditing, onSave, onLogoutAll }) {
  const [form, setForm] = useState(customer);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => setForm(customer), [customer]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await onSave({ firstName: form.firstName, lastName: form.lastName });
      setMessage('Your account has been updated.');
      onEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const details = [
    ['First Name', customer.firstName],
    ['Last Name', customer.lastName],
    ['Email', customer.email],
    ['Phone', customer.phone],
    ['Member Since', new Date(customer.createdAt || customer.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })],
  ];

  return (
    <section id="account" className="min-w-0 rounded-[28px] border border-[#E9E4DA] bg-white p-5 shadow-soft sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[.2em] text-[#9A7430]">PERSONAL DETAILS</p>
          <h2 className="mt-1 break-words text-2xl font-semibold sm:text-3xl">Account Information</h2>
        </div>
        {editing && <button type="button" onClick={() => onEditing(false)} className="shrink-0 p-2" aria-label="Close profile editor"><FiX /></button>}
      </div>
      {message && <p className="mb-4 rounded-xl bg-[#EAF3ED] p-3 text-sm text-[#1E4D3A]">{message}</p>}
      {editing ? (
        <form onSubmit={submit} className="grid min-w-0 gap-4 sm:grid-cols-2">
          <FormField label="First name" value={form.firstName || ''} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
          <FormField label="Last name" value={form.lastName || ''} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
          <FormField label="Phone" value={form.phone || ''} disabled hint="Phone changes require WhatsApp verification." />
          <div className="sm:col-span-2"><button className="h-11 w-full rounded-full bg-[#1E4D3A] px-6 text-sm font-semibold text-white sm:w-auto">{saving ? 'Saving…' : 'Save Changes'}</button></div>
        </form>
      ) : (
        <>
          <dl className="grid min-w-0 gap-x-8 gap-y-5 sm:grid-cols-2">
            {details.map(([label, value]) => <div key={label} className="min-w-0 border-b border-[#EEE9DF] pb-3"><dt className="text-[10px] font-bold uppercase tracking-[.15em] text-[#8A8F8B]">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-[#243029]">{value || '—'}</dd></div>)}
          </dl>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => onEditing(true)} className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#1E4D3A] px-5 text-sm font-semibold text-white"><FiEdit3 /> Edit Profile</button>
            <button type="button" onClick={onLogoutAll} className="flex h-11 items-center justify-center gap-2 rounded-full border border-[#9A392F] px-5 text-sm font-semibold text-[#9A392F]"><FiLogOut /> Logout All Devices</button>
          </div>
        </>
      )}
    </section>
  );
}
