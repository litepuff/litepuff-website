import { useOffers } from '../../hooks/useOffers.js';
import { formatMoney } from '../../utils/formatMoney.js';

export default function FestivalSaleBar() {
  const offers = useOffers();
  const entries = [
    <strong key="live" className="text-[#FFF4D2]">🎉 FESTIVE LIVE SALE</strong>,
    <span key="single"><b>{offers.singleDiscountPercent}% OFF</b> Single Product</span>,
    offers.combo2.enabled && <span key="two"><b>BUY 2 · {formatMoney(offers.combo2.price)}</b> + Free Delivery</span>,
    offers.combo3.enabled && <span key="three"><b>BUY 3 · {formatMoney(offers.combo3.price)}</b> + Free Delivery</span>,
    <strong key="custom" className="text-[#FFF4D2]">Customise Your Offer</strong>,
  ].filter(Boolean);

  const group = (suffix) => <div className="festival-ticker-group" aria-hidden={suffix === 'copy' || undefined}>{entries.map((entry, index) => <div key={`${entry.key || index}-${suffix}`} className="festival-ticker-item">{entry}</div>)}</div>;
  return <aside className="festival-sale-bar fixed inset-x-0 top-0 z-[60] h-[78px] overflow-hidden text-white md:h-16" aria-label="LitePuff festive live sale">
    <div className="festival-ticker-track h-full">{group('main')}{group('copy')}</div>
  </aside>;
}
