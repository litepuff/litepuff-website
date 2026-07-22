import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import periPeriImage from '../../assets/images/products/peri-peri.png';

export default function EmptyCart() {
  return (
    <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="rounded-[28px] border border-[#ECE7DD] bg-white px-6 py-12 text-center shadow-[0_12px_36px_rgba(36,48,41,0.04)] sm:py-16">
      <div className="mx-auto flex h-60 w-60 items-center justify-center rounded-full bg-[#FAF8F2]">
        <img src={periPeriImage} alt="LitePuff Peri Peri makhana jar" className="h-[210px] w-[210px] object-contain" />
      </div>
      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.28em] text-[#C89B3C]">A lighter crunch awaits</p>
      <h2 className="mt-3 font-display text-[42px] font-semibold leading-none tracking-[-0.03em] text-[#243029]">Your cart is waiting.</h2>
      <p className="mx-auto mt-4 max-w-md text-base leading-[1.8] text-[#5B5F59]">Looks like you haven&apos;t added any LitePuff snacks yet.</p>
      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link to="/products" className="inline-flex h-[52px] items-center justify-center rounded-full bg-[#1E4D3A] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#2C614A]">Explore Products</Link>
        <Link to="/products" className="px-5 py-3 text-sm font-semibold text-[#1E4D3A] underline decoration-[#C89B3C] underline-offset-4">Continue Shopping</Link>
      </div>
    </motion.section>
  );
}
