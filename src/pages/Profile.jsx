import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiLogOut } from "react-icons/fi";
import Seo from "../components/Seo.jsx";
import ProfileHeader from "../components/account/ProfileHeader.jsx";
import ProfileSidebar from "../components/account/ProfileSidebar.jsx";
import OrdersCard from "../components/account/OrdersCard.jsx";
import AddressesCard from "../components/account/AddressesCard.jsx";
import WishlistCard from "../components/account/WishlistCard.jsx";
import AccountCard from "../components/account/AccountCard.jsx";
import NewsletterCard from "../components/account/NewsletterCard.jsx";
import SupportCard from "../components/account/SupportCard.jsx";
import { useCustomerAuth } from "../context/CustomerAuthContext.jsx";
import { apiMessage, customerService } from "../services/customerService.js";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function Profile() {
  const { customer, logout, logoutAll, updateCustomer } = useCustomerAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [active, setActive] = useState("overview");
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [orderData, addressData, wishlistData] = await Promise.all([
        customerService.orders(),
        customerService.addresses(),
        customerService.wishlist(),
      ]);
      setOrders(orderData.orders);
      setAddresses(addressData.addresses);
      setWishlist(wishlistData.wishlist);
      setError("");
    } catch (err) {
      setError(apiMessage(err));
    }
  }, []);
  useEffect(() => {
    load();
    const refresh = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);
  const downloadInvoice = async (id) => {
    try {
      const response = await customerService.downloadInvoice(id);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${id}-invoice.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Invoice Ready — your download has started.");
    } catch (err) {
      showToast(`Invoice unavailable: ${apiMessage(err)}`, "error");
    }
  };
  const select = (id) => {
    setActive(id);
    if (id === "overview") window.scrollTo({ top: 0, behavior: "smooth" });
    else
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const signOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };
  const signOutEverywhere = async () => {
    if (!window.confirm("Sign out from every device?")) return;
    await logoutAll();
    navigate("/login", { replace: true });
  };
  const saveProfile = async (data) => {
    const result = await customerService.updateProfile(data);
    updateCustomer(result.customer);
  };
  const saveAddress = async (id, data) => {
    if (id) await customerService.updateAddress(id, data);
    else await customerService.addAddress(data);
    const result = await customerService.addresses();
    setAddresses(result.addresses);
  };
  const deleteAddress = async (id) => {
    if (!window.confirm("Remove this saved address?")) return;
    await customerService.removeAddress(id);
    setAddresses((items) => items.filter((item) => item.id !== id));
  };
  const removeWishlist = async (id) => {
    await customerService.removeWishlist(id);
    setWishlist((items) => items.filter((item) => item.id !== id));
  };
  const moveToCart = async (product, id) => {
    addToCart(product);
    await removeWishlist(id);
  };
  return (
    <>
      <Seo
        title="My Account"
        description="Manage your LitePuff account, orders and preferences."
        path="/profile"
      />
      <main className="min-h-screen overflow-x-clip bg-[#FAF8F2] pb-28 pt-6 sm:pt-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ProfileHeader
            customer={customer}
            onEdit={() => {
              setEditing(true);
              select("account");
            }}
          />
          {error && (
            <div className="mb-5 rounded-2xl bg-[#FFF0EC] p-4 text-sm text-[#9A392F]">
              {error}
            </div>
          )}
          <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <ProfileSidebar
              active={active}
              onSelect={select}
              onLogout={signOut}
            />
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid min-w-0 gap-4 sm:gap-6"
            >
              <OrdersCard orders={orders} onDownloadInvoice={downloadInvoice} />
              <div className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-2">
                <AddressesCard
                  addresses={addresses}
                  onSave={saveAddress}
                  onDelete={deleteAddress}
                />
                <WishlistCard
                  wishlist={wishlist}
                  onRemove={removeWishlist}
                  onMoveToCart={moveToCart}
                />
              </div>
              <AccountCard
                customer={customer}
                editing={editing}
                onEditing={setEditing}
                onSave={saveProfile}
                onLogoutAll={signOutEverywhere}
              />
              <NewsletterCard
                subscribed={customer.marketingConsent}
                onSave={async (newsletter) => {
                  const data = await customerService.updateProfile({
                    newsletter,
                  });
                  updateCustomer(data.customer);
                }}
              />
              <SupportCard />
            </motion.div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-30 flex h-12 items-center justify-center gap-2 rounded-full bg-[#243029] font-semibold text-white shadow-xl lg:hidden"
        >
          <FiLogOut /> Logout
        </button>
      </main>
    </>
  );
}
