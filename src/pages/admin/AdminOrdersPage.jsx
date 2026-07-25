import { useEffect, useState } from "react";
import AdminDataTable from "../../components/admin/AdminDataTable.jsx";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge.jsx";
import { adminService } from "../../services/adminService";
import { formatMoney } from "../../utils/formatMoney";
import { PageTitle } from "./AdminProductsPage.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const statuses = [
  "Pending",
  "Confirmed",
  "Packed",
  "Ready for Dispatch",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Returned",
  "Refunded",
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { promptAction, showToast } = useToast();

  async function load(search = "") {
    setLoading(true);
    const data = await adminService.orders({ search, limit: 100 });
    setOrders(data.orders || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(order, status) {
    const remarks = await promptAction({ title: "Update order status", message: "Add an optional customer-visible update.", placeholder: "Optional note for the customer", confirmLabel: "Update Status" });
    if (remarks === null) return;
    await adminService.updateOrderStatus(order.id, { status, remarks });
    showToast("Order status updated.");
    load();
  }

  async function downloadInvoice(order) {
    const blob = await adminService.downloadInvoice(order.id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${order.orderNumber || order.id}-invoice.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="grid gap-6">
      <PageTitle eyebrow="Orders" title="Order management" />
      <AdminDataTable
        title="Orders"
        description="Update fulfilment status and automatically append tracking events."
        rows={orders}
        loading={loading}
        onSearch={load}
        columns={[
          { key: "orderNumber", label: "Order" },
          { key: "trackingNumber", label: "Tracking ID" },
          { key: "shippingProvider", label: "Shipping Provider" },
          { key: "awbNumber", label: "AWB Number" },
          { key: "courierName", label: "Courier" },
          {
            key: "shippingStatus",
            label: "Shipment Status",
            render: (row) => <AdminStatusBadge>{row.shippingStatus}</AdminStatusBadge>,
          },
          { key: "pickupStatus", label: "Pickup Status" },
          {
            key: "customer",
            label: "Customer",
            render: (row) => row.customer?.name || row.customerId,
          },
          {
            key: "grandTotal",
            label: "Amount",
            render: (row) => formatMoney(row.grandTotal),
          },
          { key: "paymentMethod", label: "Payment" },
          { key: "gateway", label: "Gateway" },
          { key: "transactionId", label: "Transaction ID" },
          {
            key: "paymentStatus",
            label: "Pay Status",
            render: (row) => (
              <AdminStatusBadge>{row.paymentStatus}</AdminStatusBadge>
            ),
          },
          {
            key: "status",
            label: "Order Status",
            render: (row) => <AdminStatusBadge>{row.status}</AdminStatusBadge>,
          },
          {
            key: "createdAt",
            label: "Date",
            render: (row) => String(row.createdAt || "").slice(0, 10),
          },
        ]}
        actions={(row) => (
          <div className="flex gap-2">
            <select
              value={row.status}
              onChange={(event) => updateStatus(row, event.target.value)}
              className="rounded-xl border border-brand-border px-3 py-2 text-xs font-bold"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              className="admin-action"
              onClick={() =>
                adminService.createShipment(row.id).then(() => load())
              }
            >
              {row.shippingStatus === "Retry Pending" ? "Retry Shipment" : "Generate Label"}
            </button>
            {row.trackingUrl && (
              <a className="admin-action" href={row.trackingUrl} target="_blank" rel="noreferrer">
                Track
              </a>
            )}
            {row.labelUrl && (
              <a className="admin-action" href={row.labelUrl} target="_blank" rel="noreferrer" download>
                Download Label
              </a>
            )}
            {row.manifestUrl && (
              <a className="admin-action" href={row.manifestUrl} target="_blank" rel="noreferrer">
                Manifest
              </a>
            )}
            <button
              className="admin-action"
              onClick={() => downloadInvoice(row)}
            >
              Invoice
            </button>
            <button
              className="admin-action"
              onClick={() =>
                adminService
                  .payment(row.id)
                  .then(({ payment }) =>
                    showToast(
                      `${payment.Gateway || "Razorpay"} · ${payment.Status} · ${payment.TransactionReference || payment.RazorpayPaymentID || "Pending"}`,
                    ),
                  )
              }
            >
              View Payment
            </button>
            <button
              className="admin-action"
              onClick={() => adminService.requestRefund(row.id)}
            >
              Refund
            </button>
          </div>
        )}
      />
    </section>
  );
}
