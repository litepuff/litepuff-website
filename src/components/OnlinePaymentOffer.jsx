import { FiCopy, FiTag } from 'react-icons/fi';

export default function OnlinePaymentOffer({ compact = false }) {
  const copyCoupon = () => navigator.clipboard?.writeText('LITEPUFF20').catch(() => {});
  return (
    <aside className={`border border-[#DDCDAA] bg-[#FCF8EE] text-[#243029] ${compact ? 'rounded-[20px] p-4' : 'rounded-[24px] px-5 py-4 sm:px-6'}`} aria-label="Online payment offer">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#9A7430] shadow-sm"><FiTag aria-hidden="true" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A7430]">SAVE 20% INSTANTLY</p><p className="mt-0.5 text-sm font-semibold">Apply <span className="font-black">LITEPUFF20</span> during online checkout to save 20%.</p></div>
        </div>
        <button type="button" onClick={copyCoupon} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#1E4D3A] px-4 text-xs font-bold text-[#1E4D3A]"><FiCopy aria-hidden="true" /> Copy Coupon</button>
      </div>
    </aside>
  );
}
