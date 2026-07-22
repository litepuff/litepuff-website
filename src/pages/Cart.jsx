import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import CartItem from '../components/cart/CartItem.jsx';
import CartSummary from '../components/cart/CartSummary.jsx';
import EmptyCart from '../components/cart/EmptyCart.jsx';
import RecommendedProducts from '../components/cart/RecommendedProducts.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Cart() {
  const { cartItems, cartTotal, updateQuantity } = useCart();

  return (
    <>
      <Seo title="Cart" description="Review your LitePuff cart and checkout." path="/cart" />
      <main className="bg-[#FAF8F2] pb-[100px] pt-8 text-[#243029] md:pt-12 lg:pt-20">
        <div className="container-page max-w-7xl">
          <nav className="flex items-center gap-2 text-xs text-[#7A817C]" aria-label="Breadcrumb">
            <Link to="/" className="transition-colors hover:text-[#1E4D3A]">Home</Link><span aria-hidden="true">/</span><span aria-current="page" className="text-[#243029]">Cart</span>
          </nav>

          <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mt-7">
            <p className="text-[13px] font-semibold uppercase tracking-[0.35em] text-[#C89B3C]">Shopping Bag</p>
            <h1 className="mt-3 font-display text-[46px] font-semibold leading-none tracking-[-0.04em] md:text-[56px]">Your Cart</h1>
            <p className="mt-4 text-base leading-[1.8] text-[#5B5F59] md:text-[17px]">Review your selected LitePuff snacks before checkout.</p>
          </motion.header>

          {cartItems.length > 0 ? (
            <div className="mt-10 grid items-start gap-6 md:grid-cols-[minmax(0,65fr)_minmax(280px,35fr)] lg:grid-cols-[minmax(0,68fr)_minmax(320px,32fr)] lg:gap-8">
              <div className="space-y-5">
                <AnimatePresence initial={false}>
                  {cartItems.map((item) => <CartItem key={item.id} item={item} onUpdateQuantity={updateQuantity} onRemove={(id) => updateQuantity(id, 0)} />)}
                </AnimatePresence>
              </div>
              <CartSummary subtotal={cartTotal} />
            </div>
          ) : (
            <div className="mt-10"><EmptyCart /></div>
          )}

          <div className="mt-16 md:mt-20"><RecommendedProducts /></div>
        </div>
      </main>
    </>
  );
}
