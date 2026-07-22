import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiCheckCircle,
  FiCreditCard,
  FiDollarSign,
  FiLoader,
  FiMapPin,
  FiPackage,
  FiSmartphone,
  FiTruck,
} from "react-icons/fi";
import Seo from "../components/Seo.jsx";
import FirstOrderOffer from "../components/FirstOrderOffer.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useCustomerAuth } from "../context/CustomerAuthContext.jsx";
import { apiMessage, customerService } from "../services/customerService.js";
import { formatMoney } from "../utils/formatMoney.js";
import { useToast } from "../context/ToastContext.jsx";

const paymentMethods = [
  {
    id: "upi",
    label: "UPI",
    description: "Google Pay · PhonePe · Paytm",
    note: "Powered by Razorpay",
    icon: FiSmartphone,
  },
  {
    id: "card",
    label: "Credit / Debit Card",
    description: "Visa · Mastercard · RuPay",
    note: "Powered by Razorpay",
    icon: FiCreditCard,
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    description: "Available",
    note: "Additional charges if applicable",
    icon: FiDollarSign,
  },
];

const deliveryPartners = ["Shiprocket", "Delhivery", "Blue Dart", "DTDC", "India Post"];

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("Unable to load secure payment checkout."));
    document.head.appendChild(script);
  });
}

const fieldClass =
  "mt-2 h-12 w-full rounded-2xl border border-[#E3DED3] bg-white px-4 text-sm outline-none transition focus:border-[#1E4D3A] focus:ring-2 focus:ring-[#1E4D3A]/10";

function Field({
  label,
  name,
  value,
  onChange,
  required = true,
  className = "",
  placeholder = "",
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#747C77]">
        {label}
      </span>
      <input
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className={fieldClass}
      />
    </label>
  );
}

function SummaryRow({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-[#6B726D]">{label}</span>
      <span
        className={
          strong
            ? "font-display text-2xl font-semibold text-[#243029]"
            : "font-semibold text-[#243029]"
        }
      >
        {value}
      </span>
    </div>
  );
}

export default function Checkout() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [address, setAddress] = useState({
    fullName: customer
      ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
      : "",
    phone: customer?.phone || "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [coupon, setCoupon] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [paymentFailure, setPaymentFailure] = useState(null);
  const checkoutForm = useRef(null);

  const totals = useMemo(() => {
    const shipping = cartTotal >= 498 ? 0 : 29;
    const normalizedCoupon = coupon.trim().toUpperCase();
    const discount = normalizedCoupon === "LITEPUFF10" ? Math.round(cartTotal * 0.1) : normalizedCoupon === "PUFFFIRST" ? Math.min(49, cartTotal) : 0;
    return {
      subtotal: cartTotal,
      shipping,
      discount,
      tax: 0,
      grandTotal: cartTotal + shipping - discount,
    };
  }, [cartTotal, coupon]);

  const onAddressChange = (event) =>
    setAddress((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));

  async function selectWelcomeCoupon() {
    setCoupon("LITEPUFF10");
    try { await navigator.clipboard.writeText("LITEPUFF10"); } catch { /* Copy is optional on non-secure previews. */ }
  }

  async function placeOrder(event) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setPaymentFailure(null);

    if (!cartItems.length) {
      setError("Your cart is empty.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        address,
        paymentMethod,
        coupon,
        notes,
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      };
      if (paymentMethod === "cod") {
        const result = await customerService.createCashOnDeliveryOrder(payload);
        const confirmed = result.order;
        clearCart();
        showToast("Cash on Delivery order confirmed");
        setConfirmedOrder({
          id: confirmed.OrderID || confirmed.id,
          orderNumber: confirmed.OrderNumber || confirmed.orderNumber,
          trackingId: confirmed.TrackingNumber || confirmed.trackingId,
          estimatedDelivery:
            confirmed.EstimatedDelivery || confirmed.estimatedDelivery,
          paymentStatus: "Pending",
          paymentMethod: "Cash on Delivery",
          amountDue:
            confirmed.GrandTotal || confirmed.grandTotal || totals.grandTotal,
          status: "Confirmed",
        });
        return;
      }
      await loadRazorpay();
      const payment = await customerService.createRazorpayOrder(payload);
      let confirmed;
      let confirmedPayment;
      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: payment.keyId,
          amount: payment.amount,
          currency: payment.currency,
          name: "LitePuff",
          description: "Secure LitePuff checkout",
          order_id: payment.order_id,
          prefill: {
            name: address.fullName,
            email: customer?.email || "",
            contact: address.phone,
          },
          theme: { color: "#1E4D3A" },
          modal: {
            ondismiss: () =>
              reject(
                new Error(
                  "Payment was cancelled. Your cart is unchanged and you can retry.",
                ),
              ),
          },
          handler: async (gatewayResponse) => {
            try {
              const verified = await customerService.verifyRazorpayPayment({
                paymentId: payment.paymentId,
                checkoutToken: payment.checkoutToken,
                razorpayOrderId: gatewayResponse.razorpay_order_id,
                razorpayPaymentId: gatewayResponse.razorpay_payment_id,
                razorpaySignature: gatewayResponse.razorpay_signature,
              });
              confirmed = verified.order;
              confirmedPayment = verified.payment;
              resolve();
            } catch (verificationError) {
              reject(verificationError);
            }
          },
        });
        checkout.on("payment.failed", (failure) => {
          const reason = failure.error?.description || "Payment failed.";
          setPaymentFailure({ reason, paymentId: payment.paymentId });
          customerService
            .recordPaymentFailure({
              paymentId: payment.paymentId,
              checkoutToken: payment.checkoutToken,
              razorpayPaymentId: failure.error?.metadata?.payment_id,
              reason,
            })
            .catch(() => {});
          reject(new Error(reason));
        });
        checkout.open();
      });
      clearCart();
      showToast("Payment Successful");
      showToast("Order Confirmed");
      showToast("Invoice Ready");
      setConfirmedOrder({
        id: confirmed.OrderID || confirmed.id,
        orderNumber: confirmed.OrderNumber || confirmed.orderNumber,
        trackingId: confirmed.TrackingNumber || confirmed.trackingId,
        estimatedDelivery:
          confirmed.EstimatedDelivery || confirmed.estimatedDelivery,
        paymentStatus: "Paid",
        paymentMethod: confirmedPayment?.paymentMethod || "Razorpay",
        amountPaid: confirmedPayment?.amount || totals.grandTotal,
        status: "Confirmed",
      });
    } catch (err) {
      const reason = apiMessage(err);
      setError(reason);
      setPaymentFailure((current) => current || { reason });
      showToast(
        "Payment Failed. Your cart is unchanged—retry when ready.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Seo
        title="Checkout"
        description="Complete your LitePuff order securely."
        path="/checkout"
      />
      <main className="bg-[#FAF8F2] pb-28 pt-10 text-[#243029] lg:py-20">
        <div className="container-page max-w-7xl">
          <nav
            className="flex items-center gap-2 text-xs text-[#7A817C]"
            aria-label="Breadcrumb"
          >
            <Link to="/" className="hover:text-[#1E4D3A]">
              Home
            </Link>
            <span>/</span>
            <Link to="/cart" className="hover:text-[#1E4D3A]">
              Cart
            </Link>
            <span>/</span>
            <span>Checkout</span>
          </nav>

          <motion.header
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-7"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C89B3C]">
              Secure Checkout
            </p>
            <h1 className="mt-2 font-display text-[46px] font-semibold leading-none tracking-[-0.04em] md:text-[56px]">
              Complete Your Order
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#5B5F59]">
              Confirm your delivery details and pay securely with Razorpay.
              Orders are confirmed only after successful payment.
            </p>
          </motion.header>

          <form
            ref={checkoutForm}
            onSubmit={placeOrder}
            aria-busy={loading}
            className="mt-9 grid items-start gap-7 lg:grid-cols-[minmax(0,65fr)_minmax(320px,35fr)]"
          >
            <div className="space-y-6">
              <FirstOrderOffer />
              {paymentFailure && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  role="alert"
                  className="rounded-2xl border border-[#F0C9BF] bg-[#FFF3EF] p-5 text-sm text-[#9A392F]"
                >
                  <strong className="block text-base">Payment Failed</strong>
                  <p className="mt-1">{paymentFailure.reason || error}</p>
                  <p className="mt-2 text-[#6B514B]">
                    Your cart, coupon and shipping address are unchanged.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => checkoutForm.current?.requestSubmit()}
                      className="rounded-full bg-[#9A392F] px-4 py-2 font-bold text-white disabled:opacity-60"
                    >
                      Retry Payment
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        document.querySelector("[name=fullName]")?.focus()
                      }
                      className="rounded-full border border-[#9A392F] px-4 py-2 font-bold"
                    >
                      Return to Checkout
                    </button>
                  </div>
                </motion.div>
              )}

              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="rounded-[30px] border border-[#ECE7DD] bg-white p-6 shadow-soft md:p-8"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#EEF3EF] text-[#1E4D3A]">
                    <FiMapPin />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#C89B3C]">
                      Shipping Address
                    </p>
                    <h2 className="font-display text-3xl font-semibold">
                      Where should we deliver?
                    </h2>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Field
                    label="Full Name"
                    name="fullName"
                    value={address.fullName}
                    onChange={onAddressChange}
                  />
                  <Field
                    label="Phone"
                    name="phone"
                    value={address.phone}
                    onChange={onAddressChange}
                  />
                  <Field
                    label="Address Line 1"
                    name="addressLine1"
                    value={address.addressLine1}
                    onChange={onAddressChange}
                    className="md:col-span-2"
                  />
                  <Field
                    label="Address Line 2"
                    name="addressLine2"
                    value={address.addressLine2}
                    onChange={onAddressChange}
                    required={false}
                    className="md:col-span-2"
                  />
                  <Field
                    label="City"
                    name="city"
                    value={address.city}
                    onChange={onAddressChange}
                  />
                  <Field
                    label="State"
                    name="state"
                    value={address.state}
                    onChange={onAddressChange}
                  />
                  <Field
                    label="Pincode"
                    name="pincode"
                    value={address.pincode}
                    onChange={onAddressChange}
                  />
                  <Field
                    label="Country"
                    name="country"
                    value={address.country}
                    onChange={onAddressChange}
                  />
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className="rounded-[30px] border border-[#ECE7DD] bg-white p-6 shadow-soft md:p-8"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#F8F1DF] text-[#9A7430]">
                    <FiCreditCard />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#C89B3C]">
                      Payment Method
                    </p>
                    <h2 className="font-display text-3xl font-semibold">
                      Choose how to pay
                    </h2>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      aria-pressed={paymentMethod === method.id}
                    className={`min-h-[168px] rounded-3xl border p-5 text-left transition-[transform,border-color,background-color,box-shadow] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F5E3B] ${paymentMethod === method.id ? "-translate-y-1 border-[#1F5E3B] bg-[#EEF5F0] shadow-[0_12px_28px_rgba(31,94,59,0.10)]" : "border-[#E7E1D6] bg-white hover:-translate-y-0.5 hover:border-[#B9CDBF]"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <strong>{method.label}</strong>
                        <method.icon
                          className="text-[#1E4D3A]"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-2 text-sm text-[#6B726D]">
                        {method.description}
                      </p>
                      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A7430]">{method.note}</p>
                    </button>
                  ))}
                </div>
              </motion.section>

              <section className="rounded-[24px] border border-[#E4DED3] bg-white p-5 shadow-soft" aria-labelledby="delivery-partners-title">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#EEF3EF] text-[#1E4D3A]"><FiTruck aria-hidden="true" /></span>
                  <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-[#C9A227]">Trusted delivery</p><h2 id="delivery-partners-title" className="font-display text-2xl font-semibold">Shiprocket Ready</h2></div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2" aria-label="Delivery partners">
                  {deliveryPartners.map((partner) => <span key={partner} className="rounded-full border border-[#E7E1D6] bg-[#FAF8F3] px-3 py-2 text-xs font-semibold text-[#4E5550]">{partner}</span>)}
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-[#E1D5B8] bg-[#FCF8EE] p-5 shadow-soft">
                  <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-[0.2em] text-[#9A7A18]">Coupon</span>{totals.discount > 0 && <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1 rounded-full bg-[#E5F2E9] px-2.5 py-1 text-[10px] font-bold text-[#1F5E3B]"><FiCheckCircle /> Coupon Applied</motion.span>}</div>
                  <div className="mt-3 flex gap-2"><input aria-label="Coupon code" value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} placeholder="Enter coupon code" className="h-12 min-w-0 flex-1 rounded-xl border border-[#DDD3BE] bg-white px-4 text-sm outline-none" /><button type="button" onClick={() => setCoupon((value) => value.trim().toUpperCase())} className="h-12 rounded-xl bg-[#1F5E3B] px-5 text-sm font-bold text-white">Apply</button></div>
                  <button type="button" onClick={selectWelcomeCoupon} className="mt-3 flex w-full items-center justify-between rounded-xl border border-dashed border-[#C9A227] bg-white px-3 py-2.5 text-left transition hover:-translate-y-0.5"><span><strong className="block text-xs tracking-[0.08em] text-[#1F5E3B]">LITEPUFF10</strong><span className="text-[11px] text-[#6B726D]">10% OFF · First Order</span></span><span className="text-xs font-bold text-[#1F5E3B]">Copy & apply</span></button>
                </div>
                <label className="rounded-[24px] border border-[#ECE7DD] bg-white p-5 shadow-soft">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#C89B3C]">
                    Notes
                  </span>
                  <input
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Delivery notes optional"
                    className={fieldClass}
                  />
                </label>
              </section>
            </div>

            <aside className="sticky top-[120px] rounded-[30px] border border-[#ECE7DD] bg-white p-6 shadow-soft md:p-8">
              <div className="flex items-center gap-3">
                <FiPackage className="text-[#1E4D3A]" />
                <h2 className="font-display text-3xl font-semibold">
                  Order Summary
                </h2>
              </div>
              <div className="mt-6 space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between gap-4 text-sm"
                  >
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <strong>{formatMoney(item.price * item.quantity)}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-3 border-t border-[#ECE7DD] pt-5">
                <SummaryRow
                  label="Subtotal"
                  value={formatMoney(totals.subtotal)}
                />
                <SummaryRow
                  label="Shipping"
                  value={
                    totals.shipping ? formatMoney(totals.shipping) : "FREE"
                  }
                />
                <SummaryRow
                  label="Discount"
                  value={
                    totals.discount ? `-${formatMoney(totals.discount)}` : "—"
                  }
                />
                <SummaryRow label="Tax" value="Included" />
                <SummaryRow
                  label="Grand Total"
                  value={formatMoney(totals.grandTotal)}
                  strong
                />
              </div>
              <div className="mt-6 rounded-2xl bg-[#F8F6F0] p-4 text-sm text-[#5B5F59]">
                <FiTruck className="mb-2 text-[#1E4D3A]" />
                Estimated delivery:{" "}
                <strong className="text-[#243029]">3 days</strong>
              </div>
              <motion.button
                type="submit"
                disabled={loading || !cartItems.length}
                whileHover={{ y: loading ? 0 : -2 }}
                className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-[#1E4D3A] px-6 text-sm font-bold text-white transition hover:bg-[#2C614A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <FiLoader className="mr-2 animate-spin" />{" "}
                    {paymentMethod === "cod"
                      ? "Placing your order..."
                      : "Preparing secure payment..."}
                  </>
                ) : paymentMethod === "cod" ? (
                  `Place Order ${formatMoney(totals.grandTotal)}`
                ) : (
                  `Pay Securely ${formatMoney(totals.grandTotal)}`
                )}
              </motion.button>
            </aside>
          </form>
        </div>
      </main>

      <AnimatePresence>
        {confirmedOrder && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-[#243029]/50 px-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-xl rounded-[34px] bg-white p-8 text-center shadow-2xl"
            >
              <FiCheckCircle className="mx-auto text-[#1E4D3A]" size={58} />
              <h2 className="mt-4 font-display text-4xl font-semibold">
                Order Confirmed!
              </h2>
              <p className="mt-3 text-[#5B5F59]">
                Thank you for choosing LitePuff. We've received your order and
                have already started preparing it.
              </p>
              <div className="mt-6 rounded-3xl bg-[#FAF8F2] p-5 text-sm">
                <p className="text-[#747C77]">Order Number</p>
                <strong className="text-xl text-[#243029]">
                  {confirmedOrder.orderNumber}
                </strong>
                <p className="mt-3 text-[#747C77]">Tracking ID</p>
                <strong>
                  {confirmedOrder.trackingId || confirmedOrder.trackingNumber}
                </strong>
                <p className="mt-3 text-[#747C77]">Estimated Delivery</p>
                <strong>{confirmedOrder.estimatedDelivery}</strong>
                <p className="mt-3 text-[#747C77]">
                  {confirmedOrder.paymentMethod === "Cash on Delivery"
                    ? "Amount Due on Delivery"
                    : "Amount Paid"}
                </p>
                <strong>
                  {formatMoney(
                    confirmedOrder.paymentMethod === "Cash on Delivery"
                      ? confirmedOrder.amountDue
                      : confirmedOrder.amountPaid,
                  )}
                </strong>
                <p className="mt-3 text-[#747C77]">Payment Method</p>
                <strong>{confirmedOrder.paymentMethod}</strong>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => navigate(`/orders/${confirmedOrder.id}`)}
                  className="h-12 rounded-full bg-[#1E4D3A] text-sm font-bold text-white"
                >
                  Track Order
                </button>
                <button
                  onClick={() =>
                    navigate(`/order-success/${confirmedOrder.id}`)
                  }
                  className="h-12 rounded-full border border-[#1E4D3A] text-sm font-bold text-[#1E4D3A]"
                >
                  View Success Page
                </button>
              </div>
              <Link
                to="/products"
                className="mt-4 inline-flex text-sm font-semibold text-[#6B726D]"
              >
                Continue Shopping
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
