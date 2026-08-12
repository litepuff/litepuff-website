import { comboAssets } from '../../config/comboAssets.js';
import { useOffers } from '../../hooks/useOffers.js';
import { formatMoney } from '../../utils/formatMoney.js';

const openBuilder = (comboType) => window.dispatchEvent(new CustomEvent('litepuff:open-combo', { detail: { comboType } }));

export default function BuildYourBox({ compact = false }) {
  const offers = useOffers();
  const combos = [['COMBO_2', offers.combo2], ['COMBO_3', offers.combo3]].filter(([, offer]) => offer.enabled);

  if (compact) return <section className="py-4" aria-label="LitePuff festive combo offers">
    <div className="overflow-hidden rounded-[22px] border border-[#E3DAC9] bg-[#FFF9EC] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[.18em] text-[#A76525]">Festive offers</p>
        <span className="rounded-full bg-[#1E4D3A]/[.08] px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#1E4D3A]">Customise your flavours</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {combos.map(([type, offer]) => <button key={type} type="button" onClick={() => openBuilder(type)} className="group grid min-h-[92px] grid-cols-[88px_1fr_auto] items-center gap-3 overflow-hidden rounded-[16px] border border-[#E2D5BF] bg-white pr-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#C89B3C] hover:shadow-[0_8px_20px_rgba(36,48,41,.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D3A] focus-visible:ring-offset-2">
          <span className="h-full min-h-[92px] bg-[#F4EBD9] p-1.5"><img src={comboAssets[type]} alt="" className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.04]" /></span>
          <span className="min-w-0 py-2"><strong className="block text-sm font-black text-[#243029]">BUY {offer.requiredItems} · {formatMoney(offer.price)}</strong><small className="mt-1 block text-[10px] font-bold uppercase tracking-[.09em] text-[#1E6A45]">Free delivery</small></span>
          <span className="text-xs font-bold text-[#A76525]">Customise →</span>
        </button>)}
      </div>
    </div>
  </section>;

  return <section className="bg-[#1E4D3A] px-5 py-10 text-white md:px-8 md:py-14" aria-labelledby="home-box-title">
    <div className="mx-auto max-w-7xl md:flex md:items-center md:justify-between md:gap-10">
      <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#E5C36D]">Customize Your Snacks</p><h2 id="home-box-title" className="mt-2 font-display text-4xl font-semibold md:text-5xl">Build Your Box</h2><p className="mt-2 text-sm text-white/75 md:text-base">Mix your favourite flavours and get more value.</p></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 md:mt-0 md:min-w-[470px]">
        {combos.map(([type, offer]) => <button key={type} type="button" onClick={() => openBuilder(type)} className="flex min-h-[82px] items-center justify-between rounded-[18px] border border-white/20 bg-white/10 px-4 text-left text-white transition hover:-translate-y-0.5"><span><strong className="block">Any {offer.requiredItems} Products</strong><small className="text-[#E8CB7D]">FREE DELIVERY</small></span><strong className="text-xl">{formatMoney(offer.price)}</strong></button>)}
      </div>
    </div>
  </section>;
}
