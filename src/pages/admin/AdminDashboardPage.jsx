import { useEffect, useState } from "react";
import AdminDataTable from "../../components/admin/AdminDataTable.jsx";
import AdminStatCard from "../../components/admin/AdminStatCard.jsx";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge.jsx";
import { adminService } from "../../services/adminService";
import { formatMoney } from "../../utils/formatMoney";

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminService
      .dashboard()
      .then(setData)
      .catch(() => setError('Dashboard data could not be loaded. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const metrics = data?.metrics || {};
  const stats = [
    ["Realized Revenue", formatMoney(metrics.totalRevenue || 0), "Paid online and delivered COD orders"],
    ["Today's Orders", metrics.todaysOrders || 0],
    ["Pending Payments", metrics.pendingPayments || 0],
    ["Total Orders", metrics.totalOrders || 0],
    ["COD Orders", metrics.codOrders || 0],
    ["Delivered Orders", metrics.deliveredOrders || 0],
    ["Pending Shipments", metrics.pendingShipments || 0],
    ["Low Stock", metrics.lowStockProducts || 0],
  ];

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-accent">
          Dashboard
        </p>
        <h1 className="font-display text-3xl font-semibold text-brand-text sm:text-4xl">
          Business overview
        </h1>
      </div>

      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, hint]) => (
          <AdminStatCard
            key={label}
            label={label}
            value={loading ? "..." : value}
            hint={hint}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard
          title="Revenue by Month"
          rows={data?.charts?.revenueByMonth || []}
          labelKey="month"
          valueKey="revenue"
        />
        <ChartCard
          title="Orders by Status"
          rows={data?.charts?.ordersByStatus || []}
          labelKey="status"
          valueKey="count"
        />
        <ChartCard
          title="Top Products"
          rows={data?.charts?.topSellingProducts || []}
          labelKey="name"
          valueKey="quantity"
        />
      </div>

      <AdminDataTable
        title="Latest Orders"
        rows={data?.latest?.orders || []}
        loading={loading}
        columns={[
          { key: "orderNumber", label: "Order" },
          {
            key: "grandTotal",
            label: "Amount",
            render: (row) => formatMoney(row.grandTotal),
          },
          {
            key: "status",
            label: "Status",
            render: (row) => <AdminStatusBadge>{row.status}</AdminStatusBadge>,
          },
          {
            key: "createdAt",
            label: "Date",
            render: (row) => String(row.createdAt || "").slice(0, 10),
          },
        ]}
      />
      <AdminDataTable
        title="Latest Transactions"
        rows={data?.latest?.transactions || []}
        loading={loading}
        columns={[
          { key: "transactionId", label: "Transaction" },
          { key: "orderId", label: "Order" },
          { key: "method", label: "Method" },
          {
            key: "amount",
            label: "Amount",
            render: (row) => formatMoney(row.amount),
          },
          {
            key: "status",
            label: "Status",
            render: (row) => <AdminStatusBadge>{row.status}</AdminStatusBadge>,
          },
          {
            key: "paidAt",
            label: "Date",
            render: (row) => String(row.paidAt || "").slice(0, 10) || "—",
          },
        ]}
      />
    </section>
  );
}

function ChartCard({ title, rows, labelKey, valueKey }) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);
  return (
    <article className="rounded-[24px] border border-brand-border bg-white p-5 shadow-sm">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <div className="mt-5 grid gap-3">
        {rows.length ? (
          rows.map((row) => (
            <div key={row[labelKey]} className="grid gap-1">
              <div className="flex justify-between text-xs font-bold text-brand-muted">
                <span>{row[labelKey]}</span>
                <span>{row[valueKey]}</span>
              </div>
              <meter className="analytics-meter" min="0" max={max} value={Number(row[valueKey] || 0)} aria-label={`${row[labelKey]}: ${row[valueKey]}`} />
            </div>
          ))
        ) : (
          <p className="text-sm text-brand-muted">No data yet.</p>
        )}
      </div>
    </article>
  );
}
