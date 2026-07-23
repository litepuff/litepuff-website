import { FiTruck } from 'react-icons/fi';
export default function ShippingProgress({ quantity = 0 }) {
  const remaining = Math.max(0, 2 - quantity);
  const progressClass = quantity <= 0 ? 'w-0' : quantity === 1 ? 'w-1/2' : 'w-full';

  return (
    <div className="rounded-[20px] border border-[#ECE7DD] bg-[#FAF8F2] p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#E7EFE9] text-[#1E4D3A]" aria-hidden="true"><FiTruck size={15} /></span>
        <p className="text-sm leading-5 text-[#5B5F59]">{remaining > 0 ? <>Add <strong className="text-[#243029]">{remaining} more product</strong> for FREE Shipping</> : <strong className="text-[#1E4D3A]">You&apos;ve unlocked FREE Shipping</strong>}</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E2DED5]" aria-hidden="true">
        <div className={`h-full rounded-full bg-[#1E4D3A] transition-[width] duration-500 ${progressClass}`} />
      </div>
    </div>
  );
}
