import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiCheckCircle,
  FiDownload,
  FiMapPin,
  FiPackage,
  FiTruck,
} from "react-icons/fi";
import Seo from "../components/Seo.jsx";
import { apiMessage, customerService } from "../services/customerService.js";
import { formatMoney } from "../utils/formatMoney.js";

export default function OrderSuccess() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customerService
      .order(orderId)
      .then(({ order }) => setOrder(order))
      .catch((err) => setError(apiMessage(err)))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function downloadInvoice() {
    const response = await customerService.downloadInvoice(order.id);
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${order.orderNumber}-invoice.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Seo
        title="Order Confirmed"
        description="Your LitePuff order has been confirmed."
        path={`/order-success/${orderId}`}
      />
      <main className="min-h-screen bg-[#FAF8F2] py-12 text-[#243029] lg:py-20">
        <div className="container-page max-w-6xl">
          {loading && (
            <div className="rounded-[30px] bg-white p-10 text-center shadow-soft">
              Loading your order…
            </div>
          )}
          {error && (
            <div className="rounded-[30px] border border-[#F0C9BF] bg-[#FFF3EF] p-8 text-[#9A392F]">
              {error}
            </div>
          )}
          {order && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid gap-7 lg:grid-cols-[1fr_380px]"
            >
              <section className="rounded-[36px] bg-white p-7 shadow-soft md:p-10">
                <div className="grid h-20 w-20 place-items-center rounded-full bg-[#EEF3EF] text-[#1E4D3A]">
                  <FiCheckCircle size={42} />
                </div>
                <p className="mt-7 text-xs font-bold uppercase tracking-[0.3em] text-[#C89B3C]">
                  {order.paymentMethod === "Cash on Delivery"
                    ? "Order Confirmed"
                    : "Payment Successful"}
                </p>
                <h1 className="mt-3 font-display text-5xl font-semibold leading-none tracking-[-0.04em]">
                  Thank you for choosing LitePuff.
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5B5F59]">
                  We’ve received your order and have already started preparing
                  it. Your snacks are now moving through our fulfilment flow.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <Info label="Order Number" value={order.orderNumber} />
                  <Info
                    label="Tracking ID"
                    value={order.trackingId || order.trackingNumber}
                  />
                  <Info
                    label="Estimated Delivery"
                    value={order.estimatedDelivery}
                  />
                </div>
                <div className="mt-4 rounded-3xl bg-[#FAF8F2] p-4 text-sm">
                  <span className="text-[#747C77]">Transaction ID</span>
                  <strong className="ml-3 break-all text-[#243029]">
                    {order.transactionId}
                  </strong>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <Info
                    label={
                      order.paymentMethod === "Cash on Delivery"
                        ? "Amount Due"
                        : "Amount Paid"
                    }
                    value={formatMoney(order.grandTotal)}
                  />
                  <Info
                    label="Payment Method"
                    value={order.paymentMethod || "Razorpay"}
                  />
                  <Info
                    label="Payment Status"
                    value={order.paymentStatus || "Paid"}
                  />
                </div>

                <div className="mt-8 rounded-[28px] border border-[#ECE7DD] p-5">
                  <h2 className="font-display text-3xl font-semibold">
                    Items Ordered
                  </h2>
                  <div className="mt-4 divide-y divide-[#EEE9DF]">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between gap-4 py-4 text-sm"
                      >
                        <span>
                          {item.productName} × {item.quantity}
                        </span>
                        <strong>{formatMoney(item.total)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <aside className="space-y-5">
                <Card icon={FiMapPin} title="Shipping Address">
                  <p>{order.address?.FullName || order.address?.fullName}</p>
                  <p>
                    {order.address?.AddressLine1 || order.address?.addressLine1}
                  </p>
                  {(order.address?.AddressLine2 ||
                    order.address?.addressLine2) && (
                    <p>
                      {order.address?.AddressLine2 ||
                        order.address?.addressLine2}
                    </p>
                  )}
                  <p>
                    {order.address?.City || order.address?.city},{" "}
                    {order.address?.State || order.address?.state}{" "}
                    {order.address?.Pincode || order.address?.pincode}
                  </p>
                </Card>
                <Card icon={FiPackage} title="Order Total">
                  <div className="space-y-2 text-sm">
                    <Row label="MRP" value={formatMoney(order.subtotal)} />
                    {order.couponDiscount > 0 && <Row label="Coupon Discount" value={`-${formatMoney(order.couponDiscount)}`} />}
                    <Row
                      label={String(order.paymentMethod).toLowerCase().includes("cash") ? "Shipping Included" : "Shipping"}
                      value={
                        String(order.paymentMethod).toLowerCase().includes("cash") ? "Included" : order.shipping ? formatMoney(order.shipping) : "FREE"
                      }
                    />
                    <Row label="Tax" value="Included" />
                    <Row
                      label="Grand Total"
                      value={formatMoney(order.grandTotal)}
                      strong
                    />
                  </div>
                </Card>
                <Card icon={FiDownload} title="Invoice">
                  <button
                    type="button"
                    onClick={downloadInvoice}
                    className="font-semibold text-[#1E4D3A]"
                  >
                    Download invoice PDF
                  </button>
                </Card>
                <div className="grid gap-3">
                  <Link
                    to={`/orders/${order.id}`}
                    className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#1E4D3A] text-sm font-bold text-white"
                  >
                    Track Order <FiTruck />
                  </Link>
                  <Link
                    to="/products"
                    className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#1E4D3A] text-sm font-bold text-[#1E4D3A]"
                  >
                    Continue Shopping <FiArrowRight />
                  </Link>
                </div>
              </aside>
            </motion.div>
          )}
        </div>
      </main>
    </>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-3xl bg-[#FAF8F2] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A7430]">
        {label}
      </p>
      <strong className="mt-2 block text-sm">{value}</strong>
    </div>
  );
}

function Card({ icon: Icon, title, children }) {
  return (
    <section className="rounded-[28px] bg-white p-6 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <Icon className="text-[#1E4D3A]" />
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
      </div>
      <div className="text-sm leading-7 text-[#5B5F59]">{children}</div>
    </section>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[#6B726D]">{label}</span>
      <strong className={strong ? "text-lg text-[#243029]" : "text-[#243029]"}>
        {value}
      </strong>
    </div>
  );
}
