import { useEffect, useState } from "react";
import AdminDataTable from "../../components/admin/AdminDataTable.jsx";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge.jsx";
import { adminService } from "../../services/adminService";
import { formatMoney } from "../../utils/formatMoney";
import { PageTitle } from "./AdminProductsPage.jsx";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  async function load(search = "") {
    setLoading(true);
    const data = await adminService.customers({ search, limit: 100 });
    setCustomers(data.customers || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(row, status) {
    await adminService.updateCustomerStatus(row.id, status);
    load();
  }

  async function viewCustomer(row) {
    setDetailsLoading(true);
    try {
      setDetails(await adminService.customer(row.id));
    } finally {
      setDetailsLoading(false);
    }
  }

  return (
    <section className="grid gap-6">
      <PageTitle eyebrow="Customers" title="Customer management" />
      <AdminDataTable
        title="Customers"
        rows={customers}
        loading={loading}
        onSearch={load}
        columns={[
          { key: "name", label: "Customer" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "orders", label: "Orders" },
          {
            key: "totalSpent",
            label: "Total Spent",
            render: (row) => formatMoney(row.totalSpent),
          },
          {
            key: "status",
            label: "Status",
            render: (row) => <AdminStatusBadge>{row.status}</AdminStatusBadge>,
          },
        ]}
        actions={(row) => (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => viewCustomer(row)}
              className="rounded-xl border border-brand-border px-3 py-2 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              View
            </button>
            <select
              aria-label={`Change status for ${row.name}`}
              value={row.status}
              onChange={(event) => setStatus(row, event.target.value)}
              className="rounded-xl border border-brand-border px-3 py-2 text-xs font-bold"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        )}
      />
      {(detailsLoading || details) && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Customer payment history"
        >
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.2em] text-brand-accent">
                  Customer details
                </p>
                <h2 className="font-display text-3xl font-black">
                  {details?.customer
                    ? `${details.customer.FirstName || ""} ${details.customer.LastName || ""}`.trim()
                    : "Loading…"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetails(null)}
                aria-label="Close customer details"
                className="rounded-full border border-brand-border px-3 py-2 font-bold"
              >
                Close
              </button>
            </div>
            {details && (
              <>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Summary
                    label="Total Orders"
                    value={details.summary?.totalOrders || 0}
                  />
                  <Summary
                    label="Total Spend"
                    value={formatMoney(details.summary?.totalSpend || 0)}
                  />
                  <Summary
                    label="Latest Payment"
                    value={details.latestPayment?.status || "No payments"}
                  />
                </div>
                <h3 className="mt-7 font-display text-2xl font-black">
                  Payment history
                </h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-brand-border text-xs uppercase tracking-wider text-brand-muted">
                        <th className="py-3">Transaction</th>
                        <th>Order</th>
                        <th>Method</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.payments?.length ? (
                        details.payments.map((payment) => (
                          <tr
                            key={payment.id}
                            className="border-b border-brand-border/60"
                          >
                            <td className="py-3 font-semibold">
                              {payment.transactionId || "—"}
                            </td>
                            <td>{payment.orderId}</td>
                            <td>{payment.method || "—"}</td>
                            <td>{formatMoney(payment.amount)}</td>
                            <td>
                              <AdminStatusBadge>
                                {payment.status}
                              </AdminStatusBadge>
                            </td>
                            <td>
                              {String(payment.paidAt || "").slice(0, 10) || "—"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="6"
                            className="py-8 text-center text-brand-muted"
                          >
                            No payments yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Summary({ label, value }) {
  return (
    <div className="rounded-2xl bg-brand-background p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-brand-muted">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-brand-text">{value}</p>
    </div>
  );
}
