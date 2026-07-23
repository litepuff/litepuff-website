import { FiTruck } from 'react-icons/fi';
export default function FreeShippingBar({ quantity = 0 }) {
  const remaining = Math.max(0, 2 - quantity);
  const progressClass = quantity <= 0 ? 'w-0' : quantity === 1 ? 'w-1/2' : 'w-full';

  return (
    <section className="rounded-[22px] border border-[#ECE7DD] bg-white p-4" aria-label="Free shipping progress">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E8F0EA] text-[#1E4D3A]" aria-hidden="true"><FiTruck size={17} /></span>
        <p className="text-sm leading-5 text-[#4E5550]">
          {remaining > 0 ? <>Add <strong className="text-[#243029]">{remaining} more product</strong> for free shipping.</> : <strong className="text-[#1E4D3A]">You unlocked free shipping.</strong>}
        </p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#ECE7DD]" aria-hidden="true">
        <div className={`h-full rounded-full bg-[#1E4D3A] transition-[width] duration-500 ${progressClass}`} />
      </div>
    </section>
  );
}
