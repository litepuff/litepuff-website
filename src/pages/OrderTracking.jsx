import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiCheck,
  FiClock,
  FiDownload,
  FiMapPin,
  FiPackage,
  FiTruck,
} from "react-icons/fi";
import Seo from "../components/Seo.jsx";
import { apiMessage, customerService } from "../services/customerService.js";
import { formatMoney } from "../utils/formatMoney.js";

const stages = [
  "Pending",
  "Confirmed",
  "Packed",
  "Ready for Dispatch",
  "Shipped",
  "Out for Delivery",
  "Delivered",
];

export default function OrderTracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      customerService.order(orderId),
      customerService.tracking(orderId),
    ])
      .then(([orderData, trackingData]) => {
        setOrder(orderData.order);
        setTracking(trackingData.tracking || []);
      })
      .catch((err) => setError(apiMessage(err)))
      .finally(() => setLoading(false));
  }, [orderId]);

  const currentIndex = useMemo(
    () =>
      Math.max(
        0,
        stages.findIndex((stage) => stage === (order?.status || "Pending")),
      ),
    [order],
  );

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
        title="Track Order"
        description="Track your LitePuff order."
        path={`/orders/${orderId}`}
      />
      <main className="min-h-screen bg-[#FAF8F2] py-12 text-[#243029] lg:py-20">
        <div className="container-page max-w-7xl">
          {loading && (
            <div className="rounded-[30px] bg-white p-10 text-center shadow-soft">
              Loading tracking…
            </div>
          )}
          {error && (
            <div className="rounded-[30px] border border-[#F0C9BF] bg-[#FFF3EF] p-8 text-[#9A392F]">
              {error}
            </div>
          )}
          {order && (
            <>
              <motion.header
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[36px] bg-white p-7 shadow-soft md:p-10"
              >
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#C89B3C]">
                  Order Tracking
                </p>
                <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                  <div>
                    <h1 className="font-display text-5xl font-semibold leading-none tracking-[-0.04em]">
                      {order.orderNumber}
                    </h1>
                    <p className="mt-3 text-[#5B5F59]">
                      Tracking ID:{" "}
                      <strong>
                        {order.trackingId || order.trackingNumber}
                      </strong>
                    </p>
                    <p className="mt-1 text-[#5B5F59]">
                      Estimated delivery:{" "}
                      <strong>{order.estimatedDelivery}</strong>
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-[#EEF3EF] px-4 py-2 text-sm font-bold text-[#1E4D3A]">
                    {order.status}
                  </span>
                </div>
              </motion.header>

              <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
                <section className="rounded-[36px] bg-white p-7 shadow-soft md:p-10">
                  <h2 className="font-display text-3xl font-semibold">
                    Delivery Timeline
                  </h2>
                  <div className="mt-8 space-y-0">
                    {stages.map((stage, index) => {
                      const entry = tracking.find(
                        (item) => item.status === stage,
                      );
                      const active = index <= currentIndex;
                      return (
                        <div
                          key={stage}
                          className="grid grid-cols-[40px_1fr] gap-4"
                        >
                          <div className="flex flex-col items-center">
                            <span
                              className={`grid h-10 w-10 place-items-center rounded-full ${active ? "bg-[#1E4D3A] text-white" : "bg-[#F1EDE5] text-[#9A9A9A]"}`}
                            >
                              {active ? <FiCheck /> : <FiClock />}
                            </span>
                            {index < stages.length - 1 && (
                              <span
                                className={`h-16 w-px ${active ? "bg-[#1E4D3A]" : "bg-[#E4DED2]"}`}
                              />
                            )}
                          </div>
                          <div className="pb-7">
                            <h3 className="font-semibold">{stage}</h3>
                            <p className="mt-1 text-sm text-[#6B726D]">
                              {entry?.description ||
                                (active ? "Completed" : "Awaiting update")}
                            </p>
                            {entry?.dateTime && (
                              <p className="mt-1 text-xs text-[#9A7430]">
                                {new Date(entry.dateTime).toLocaleString(
                                  "en-IN",
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <aside className="space-y-5">
                  <Card icon={FiPackage} title="Items">
                    {order.items.map((item) => (
                      <Row
                        key={item.id}
                        label={`${item.productName} × ${item.quantity}`}
                        value={formatMoney(item.total)}
                      />
                    ))}
                  </Card>
                  <Card icon={FiMapPin} title="Shipping Address">
                    <p>{order.address?.FullName || order.address?.fullName}</p>
                    <p>
                      {order.address?.AddressLine1 ||
                        order.address?.addressLine1}
                    </p>
                    <p>
                      {order.address?.City || order.address?.city},{" "}
                      {order.address?.State || order.address?.state}{" "}
                      {order.address?.Pincode || order.address?.pincode}
                    </p>
                  </Card>
                  <Card icon={FiTruck} title="Payment & Totals">
                    <Row
                      label="Payment Method"
                      value={order.paymentMethod || "Razorpay"}
                    />
                    <Row
                      label="Gateway"
                      value={order.paymentGateway || "Razorpay"}
                    />
                    <Row label="Payment Status" value={order.paymentStatus} />
                    <Row label="Transaction ID" value={order.transactionId} />
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
                    />
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
                  <Link
                    to="/profile"
                    className="flex h-12 items-center justify-center rounded-full border border-[#1E4D3A] text-sm font-bold text-[#1E4D3A]"
                  >
                    Back to Profile
                  </Link>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function Card({ icon: Icon, title, children }) {
  return (
    <section className="rounded-[28px] bg-white p-6 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <Icon className="text-[#1E4D3A]" />
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
      </div>
      <div className="space-y-3 text-sm leading-7 text-[#5B5F59]">
        {children}
      </div>
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <strong className="text-[#243029]">{value}</strong>
    </div>
  );
}
