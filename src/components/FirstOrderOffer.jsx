import { FiArrowRight, FiTag } from 'react-icons/fi';

export default function FirstOrderOffer({ compact = false }) {
  return (
    <aside className={`border border-[#DDCDAA] bg-[#FCF8EE] text-[#243029] ${compact ? 'rounded-[20px] p-4' : 'rounded-[24px] px-5 py-4 sm:px-6'}`} aria-label="First order offer">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#9A7430] shadow-sm"><FiTag aria-hidden="true" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A7430]">Welcome offer</p><p className="mt-0.5 text-sm font-semibold">Get 10% off your first order with <span className="font-black">LITEPUFF10</span>.</p></div>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1E4D3A]">Claim offer <FiArrowRight aria-hidden="true" /></span>
      </div>
    </aside>
  );
}
