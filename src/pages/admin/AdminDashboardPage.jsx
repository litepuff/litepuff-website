import { useEffect, useState } from "react";
import AdminDataTable from "../../components/admin/AdminDataTable.jsx";
import AdminStatCard from "../../components/admin/AdminStatCard.jsx";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge.jsx";
import { adminService } from "../../services/adminService";
import { formatMoney } from "../../utils/formatMoney";

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .dashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const metrics = data?.metrics || {};
  const stats = [
    ["Total Revenue", formatMoney(metrics.totalRevenue || 0)],
    ["Today's Revenue", formatMoney(metrics.todaysRevenue || 0)],
    ["Today's Payments", metrics.todaysPayments || 0],
    ["Today's Orders", metrics.todaysOrders || 0],
    ["Successful Payments", metrics.successfulPayments || 0],
    ["Failed Payments", metrics.failedPayments || 0],
    ["Pending Payments", metrics.pendingPayments || 0],
    ["Average Order Value", formatMoney(metrics.averageOrderValue || 0)],
    ["Total Orders", metrics.totalOrders || 0],
    ["Pending Orders", metrics.pendingOrders || 0],
    ["Delivered Orders", metrics.deliveredOrders || 0],
    ["Cancelled Orders", metrics.cancelledOrders || 0],
    ["Customers", metrics.totalCustomers || 0],
    ["Products", metrics.products || 0],
    ["Subscribers", metrics.newsletterSubscribers || 0],
    ["Avg Rating", metrics.averageRating || 0],
  ];

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-accent">
          Dashboard
        </p>
        <h1 className="font-display text-4xl font-black text-brand-text">
          Business overview
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(([label, value]) => (
          <AdminStatCard
            key={label}
            label={label}
            value={loading ? "..." : value}
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
      <h2 className="font-display text-2xl font-black">{title}</h2>
      <div className="mt-5 grid gap-3">
        {rows.length ? (
          rows.map((row) => (
            <div key={row[labelKey]} className="grid gap-1">
              <div className="flex justify-between text-xs font-bold text-brand-muted">
                <span>{row[labelKey]}</span>
                <span>{row[valueKey]}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-brand-background">
                <div
                  className="h-full rounded-full bg-brand-primary"
                  style={{
                    width: `${(Number(row[valueKey] || 0) / max) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-brand-muted">No data yet.</p>
        )}
      </div>
    </article>
  );
}
