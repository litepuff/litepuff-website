import { motion } from 'framer-motion';
import { FiGrid, FiPackage, FiMapPin, FiHeart, FiUser, FiMail, FiLogOut } from 'react-icons/fi';

const items = [['overview','Dashboard',FiGrid],['orders','My Orders',FiPackage],['addresses','Addresses',FiMapPin],['wishlist','Wishlist',FiHeart],['account','Account Settings',FiUser],['newsletter','Newsletter',FiMail]];
export default function ProfileSidebar({ active, onSelect, onLogout }) {
  return <aside className="rounded-[28px] border border-[#ECE7DD] bg-white p-3 shadow-soft lg:sticky lg:top-24">
    <nav className="flex gap-2 overflow-x-auto lg:grid" aria-label="Account sections">{items.map(([id,label,Icon]) => <motion.button whileHover={{ x: 2 }} key={id} onClick={() => onSelect(id)} className={`flex min-w-max items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-semibold transition ${active === id ? 'bg-[#E8F0EB] text-[#1E4D3A]' : 'text-[#5E6762] hover:bg-[#F7F5EF] hover:text-[#243029]'}`}><Icon size={18}/>{label}</motion.button>)}</nav>
    <button onClick={onLogout} className="mt-3 hidden w-full items-center gap-3 border-t border-[#EEE9DF] px-4 pt-5 text-sm font-semibold text-[#9A392F] lg:flex"><FiLogOut size={18}/> Logout</button>
  </aside>;
}
