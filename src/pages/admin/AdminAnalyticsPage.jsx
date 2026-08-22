import { useEffect, useState } from 'react';
import AdminStatCard from '../../components/admin/AdminStatCard.jsx';
import { adminService } from '../../services/adminService';
import { formatMoney } from '../../utils/formatMoney';
import { PageTitle } from './AdminProductsPage.jsx';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);

  useEffect(() => { adminService.dashboard().then(setData); }, []);

  const metrics = data?.metrics || {};
  const charts = data?.charts || {};

  async function downloadReport(type, format = 'csv') {
    const blob = await adminService.exportReport(type, { format });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-report.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="grid gap-6">
      <PageTitle eyebrow="Analytics" title="Revenue, growth and product insights">
        <div className="flex flex-wrap gap-2">
          {['orders', 'customers', 'products', 'reviews', 'newsletter', 'revenue'].map((type) => (
            <button key={type} onClick={() => downloadReport(type, 'xlsx')} className="admin-action capitalize">{type} XLSX</button>
          ))}
        </div>
      </PageTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Revenue" value={formatMoney(metrics.totalRevenue || 0)} />
        <AdminStatCard label="Orders" value={metrics.totalOrders || 0} />
        <AdminStatCard label="Customers" value={metrics.totalCustomers || 0} />
        <AdminStatCard label="Average Rating" value={metrics.averageRating || 0} />
      </div>
      <section className="rounded-2xl border border-brand-border bg-white p-5 sm:p-6" aria-labelledby="meta-health-title">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-accent">Meta tracking health</p>
        <h2 id="meta-health-title" className="mt-2 font-display text-2xl font-semibold">Conversion infrastructure</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <HealthItem label="Browser Pixel" value={import.meta.env.VITE_META_PIXEL_ID ? 'Configured' : 'Not configured in this build'} />
          <HealthItem label="Conversions API" value="Server-managed" />
          <HealthItem label="Meta Ads reporting" value="Not connected" />
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-brand-muted">Event delivery is handled by the existing Pixel and server-side purchase queue. Ads spend, ROAS and campaign reporting are not available because the Meta reporting API is not connected.</p>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Insight title="Revenue by Month" rows={charts.revenueByMonth || []} valueKey="revenue" labelKey="month" />
        <Insight title="Orders by Status" rows={charts.ordersByStatus || []} valueKey="count" labelKey="status" />
        <Insight title="Best Sellers" rows={charts.topSellingProducts || []} valueKey="quantity" labelKey="name" />
        <Insight title="Sales Growth" rows={charts.revenueByMonth || []} valueKey="orders" labelKey="month" />
      </div>
    </section>
  );
}

function HealthItem({ label, value }) {
  return <div className="border-l-2 border-brand-accent/60 pl-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">{label}</p><p className="mt-1 text-sm font-semibold text-brand-text">{value}</p></div>;
}

function Insight({ title, rows, labelKey, valueKey }) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);
  return (
    <article className="rounded-[24px] border border-brand-border bg-white p-5 shadow-sm">
      <h2 className="font-display text-2xl font-black">{title}</h2>
      <div className="mt-5 grid gap-3">
        {rows.length ? rows.map((row) => (
          <div key={`${title}-${row[labelKey]}`}>
            <div className="flex justify-between text-sm font-bold"><span>{row[labelKey]}</span><span>{row[valueKey]}</span></div>
            <meter className="analytics-meter mt-2 block" min="0" max={max} value={Number(row[valueKey] || 0)} aria-label={`${row[labelKey]}: ${row[valueKey]}`} />
          </div>
        )) : <p className="text-sm text-brand-muted">No analytics available yet.</p>}
      </div>
    </article>
  );
}
