import {
  FiArrowRight,
  FiDownload,
  FiEye,
  FiPackage,
  FiTruck,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { formatMoney } from "../../utils/formatMoney.js";

const badge = {
  "Order Placed": "bg-[#EEF3EF] text-[#1E4D3A]",
  Preparing: "bg-[#F8F1DF] text-[#9A7430]",
  Packed: "bg-[#F4EFE7] text-[#6D5841]",
  Shipped: "bg-[#EAF1F8] text-[#2E5B80]",
  Delivered: "bg-[#EEF3EF] text-[#1E4D3A]",
  Pending: "bg-[#FFF3E3] text-[#9A7430]",
};

export default function OrdersCard({ orders = [], onDownloadInvoice }) {
  return (
    <section
      id="orders"
      className="rounded-[28px] border border-[#E9E4DA] bg-white p-6 shadow-soft sm:p-7"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[.2em] text-[#9A7430]">
            YOUR PURCHASES
          </p>
          <h2 className="mt-1 text-3xl font-semibold">Recent Orders</h2>
        </div>
        <FiPackage className="text-[#1E4D3A]" size={22} />
      </div>

      {orders.length ? (
        <div className="divide-y divide-[#EEE9DF]">
          {orders.slice(0, 6).map((order) => (
            <article
              key={order.id}
              className="grid gap-3 py-4 text-sm lg:grid-cols-[1.1fr_0.75fr_1fr_0.7fr_auto] lg:items-center"
            >
              <div>
                <strong className="block text-base">
                  {order.orderNumber || order.id}
                </strong>
                <span className="text-xs text-[#747C77]">
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString("en-IN")
                    : "—"}
                </span>
              </div>
              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${badge[order.status] || "bg-[#F4F1EA] text-[#5B5F59]"}`}
              >
                {order.status}
              </span>
              <div className="min-w-0">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge[order.paymentStatus] || "bg-[#FFF3E3] text-[#9A7430]"}`}
                >
                  {order.paymentStatus || "Pending"}
                </span>
                <p className="mt-1 truncate text-xs text-[#747C77]">
                  {order.paymentMethod || "Razorpay"}
                  {order.transactionId ? ` · ${order.transactionId}` : ""}
                </p>
              </div>
              <span className="font-semibold">
                {formatMoney(order.amount || order.grandTotal || 0)}
              </span>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/order-success/${order.id}`}
                  className="inline-flex items-center gap-1 rounded-full border border-[#DCD7CD] px-3 py-2 text-xs font-semibold text-[#243029]"
                >
                  <FiEye /> Details
                </Link>
                <Link
                  to={`/orders/${order.id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-[#1E4D3A] px-3 py-2 text-xs font-semibold text-white"
                >
                  <FiTruck /> Track
                </Link>
                {order.paymentStatus === "Paid" && (
                  <button
                    type="button"
                    onClick={() => onDownloadInvoice?.(order.id)}
                    aria-label={`Download invoice for ${order.orderNumber || order.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-[#DCD7CD] px-3 py-2 text-xs font-semibold text-[#243029] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E4D3A]"
                  >
                    <FiDownload /> Invoice
                  </button>
                )}
                {order.paymentStatus === "Failed" && (
                  <Link
                    to="/checkout"
                    className="inline-flex items-center gap-1 rounded-full border border-[#A43E32] px-3 py-2 text-xs font-semibold text-[#A43E32]"
                  >
                    Retry Payment
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-[#F8F6F0] px-5 py-9 text-center">
          <FiPackage className="mx-auto text-[#9A7430]" size={28} />
          <p className="mt-3 font-display text-2xl font-semibold">
            No orders yet.
          </p>
          <p className="mt-1 text-sm text-[#747C77]">
            Your next delicious ritual can begin here.
          </p>
          <Link
            to="/products"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1E4D3A]"
          >
            Start Shopping <FiArrowRight />
          </Link>
        </div>
      )}
    </section>
  );
}
