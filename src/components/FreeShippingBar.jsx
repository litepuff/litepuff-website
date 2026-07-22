import { FiTruck } from 'react-icons/fi';
import { formatMoney } from '../utils/formatMoney';

export default function FreeShippingBar({ subtotal, threshold = 499 }) {
  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.min(100, (subtotal / threshold) * 100);

  return (
    <section className="rounded-[22px] border border-[#ECE7DD] bg-white p-4" aria-label="Free shipping progress">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E8F0EA] text-[#1E4D3A]" aria-hidden="true"><FiTruck size={17} /></span>
        <p className="text-sm leading-5 text-[#4E5550]">
          {remaining > 0 ? <>Add <strong className="text-[#243029]">{formatMoney(remaining)}</strong> more for free shipping.</> : <strong className="text-[#1E4D3A]">You unlocked free shipping.</strong>}
        </p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#ECE7DD]" aria-hidden="true">
        <div className="h-full rounded-full bg-[#1E4D3A] transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>
    </section>
  );
}
