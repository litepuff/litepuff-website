import {
  FiGrid,
  FiPackage,
  FiMapPin,
  FiHeart,
  FiUser,
  FiMail,
  FiLogOut,
} from "react-icons/fi";

const items = [
  ["overview", "Dashboard", FiGrid],
  ["orders", "My Orders", FiPackage],
  ["addresses", "Addresses", FiMapPin],
  ["wishlist", "Wishlist", FiHeart],
  ["account", "Account Settings", FiUser],
  ["newsletter", "Newsletter", FiMail],
];

export default function ProfileSidebar({ active, onSelect, onLogout }) {
  return (
    <aside className="w-full max-w-full overflow-hidden rounded-[28px] border border-[#ECE7DD] bg-white p-3 shadow-soft lg:sticky lg:top-24">
      <nav
        className="scrollbar-hidden flex w-full max-w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 lg:grid lg:overflow-visible"
        aria-label="Account sections"
      >
        {items.map(([id, label, Icon]) => (
          <button
            type="button"
            key={id}
            onClick={() => onSelect(id)}
            className={`flex min-h-11 shrink-0 snap-start items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors lg:w-full ${
              active === id
                ? "bg-[#E8F0EB] text-[#1E4D3A]"
                : "text-[#5E6762] hover:bg-[#F7F5EF] hover:text-[#243029]"
            }`}
          >
            <Icon className="shrink-0" size={18} aria-hidden="true" />
            <span className="whitespace-nowrap">{label}</span>
          </button>
        ))}
      </nav>
      <button
        type="button"
        onClick={onLogout}
        className="mt-3 hidden min-h-11 w-full items-center gap-3 border-t border-[#EEE9DF] px-4 pt-4 text-sm font-semibold text-[#9A392F] lg:flex"
      >
        <FiLogOut size={18} aria-hidden="true" /> Logout
      </button>
    </aside>
  );
}
