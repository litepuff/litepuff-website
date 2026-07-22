const tones = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  pending: 'bg-amber-50 text-amber-700 ring-amber-100',
  preparing: 'bg-amber-50 text-amber-700 ring-amber-100',
  draft: 'bg-slate-50 text-slate-600 ring-slate-100',
  read: 'bg-slate-50 text-slate-600 ring-slate-100',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-100',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-100',
  inactive: 'bg-rose-50 text-rose-700 ring-rose-100'
};

export default function AdminStatusBadge({ children }) {
  const key = String(children || '').toLowerCase();
  const tone = Object.entries(tones).find(([name]) => key.includes(name))?.[1] || 'bg-brand-background text-brand-text ring-brand-border';
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${tone}`}>{children || '—'}</span>;
}
