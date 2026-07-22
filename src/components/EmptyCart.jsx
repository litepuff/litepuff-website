import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import periPeriImage from '../assets/images/products/peri-peri.png';

export default function EmptyCart({ onClose }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="flex flex-1 flex-col items-center justify-center px-7 py-12 text-center">
      <div className="flex h-52 w-52 items-center justify-center rounded-full border border-[#ECE7DD] bg-white shadow-[0_12px_32px_rgba(36,48,41,0.04)]">
        <img src={periPeriImage} alt="LitePuff Peri Peri makhana jar" className="h-40 w-40 object-contain" />
      </div>
      <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#C89B3C]">Your next ritual awaits</p>
      <h3 className="mt-2 font-display text-[38px] font-semibold leading-none tracking-[-0.03em] text-[#243029]">Your bag is empty</h3>
      <p className="mt-4 max-w-[300px] text-sm leading-6 text-[#626964]">Discover light, beautifully roasted makhana made for everyday moments.</p>
      <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
        <Link to="/products" onClick={onClose} className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-[#1E4D3A] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#2C614A]">Continue Shopping</Link>
      </motion.div>
    </motion.div>
  );
}
