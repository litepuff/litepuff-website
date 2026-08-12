import { FiX } from 'react-icons/fi';

export default function CartHeader({ itemCount, onClose, closeButtonRef }) {
  return (
    <header className="flex items-center justify-between border-b border-[#ECE7DD] px-4 py-4 sm:px-6 sm:py-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#C89B3C]">LitePuff</p>
        <div className="mt-1 flex items-baseline gap-3">
          <h2 id="cart-drawer-title" className="font-display text-[30px] font-semibold leading-none tracking-[-0.03em] text-[#243029] sm:text-[34px]">Shopping Bag</h2>
          <span className="text-sm text-[#6B726D]">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        </div>
      </div>
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        className="grid h-10 w-10 place-items-center rounded-full border border-[#E5DED2] bg-white text-[#1E4D3A] shadow-sm transition-colors duration-300 hover:border-[#1E4D3A]"
        aria-label="Close shopping bag"
      >
        <FiX size={21} />
      </button>
    </header>
  );
}
