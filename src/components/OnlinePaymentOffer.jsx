import { useState } from 'react';
import { FiCheck, FiCopy, FiTag } from 'react-icons/fi';

export default function OnlinePaymentOffer({ compact = false, className = '' }) {
  const [copied, setCopied] = useState(false);

  const copyCoupon = async () => {
    try {
      await navigator.clipboard.writeText('LITEPUFF20');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <aside
      className={`w-full max-w-full overflow-hidden rounded-2xl border border-[#DDCDAA] bg-[#FCF8EE] p-3 text-[#243029] ${
        compact ? '' : 'sm:p-4'
      } ${className}`}
      aria-label="Online payment offer"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#9A7430] shadow-sm">
          <FiTag className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5">Save 20% on Online Payment</p>
          <p className="mt-0.5 text-xs leading-5 text-[#667068]">Use coupon LITEPUFF20 at checkout.</p>
        </div>
        <button
          type="button"
          onClick={copyCoupon}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#1E4D3A] px-3 text-xs font-bold text-[#1E4D3A] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D3A] focus-visible:ring-offset-2"
          aria-label="Copy coupon code LITEPUFF20"
        >
          {copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
          <span className="hidden min-[360px]:inline">{copied ? 'Copied' : 'Copy Code'}</span>
        </button>
      </div>
    </aside>
  );
}
