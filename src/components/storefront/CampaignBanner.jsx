import { Link } from 'react-router-dom';
import CampaignImage from './CampaignImage.jsx';
import { useOffers } from '../../hooks/useOffers.js';
import { formatMoney } from '../../utils/formatMoney.js';
import { storefrontCampaign } from '../../config/storefrontCampaign.js';

export default function CampaignBanner() {
  const offers = useOffers();
  return <section className="px-4 py-7 sm:px-6 md:px-8 md:py-9" aria-labelledby="festive-campaign-title"><div className="festival-campaign-shell mx-auto grid max-w-7xl overflow-hidden rounded-[28px] md:grid-cols-[45%_55%] md:items-stretch"><div className="relative z-10 flex flex-col justify-center p-6 text-white md:p-7 lg:p-10"><p className="text-xs font-black uppercase tracking-[.24em] text-[#E8C66E]">LitePuff Festive Sale</p><h2 id="festive-campaign-title" className="mt-2 font-display text-4xl font-semibold leading-none lg:text-5xl">Celebrate. Snack. Save.</h2><p className="mt-2 text-sm text-white/75">Festive flavours. Better value.</p><div className="mt-6 flex flex-wrap gap-x-5 gap-y-3"><Offer value={`${offers.singleDiscountPercent}% OFF`} label="Single" /><Offer value="BUY 2" label={`${formatMoney(offers.combo2.price)} · Free Delivery`} /><Offer value="BUY 3" label={`${formatMoney(offers.combo3.price)} · Free Delivery`} /></div><p className="mt-5 text-sm font-bold text-[#E8C66E]">Customise Your Offer</p><Link to="/products" className="mt-5 inline-flex h-12 w-fit items-center rounded-full bg-[#FFF8E8] px-7 text-sm font-bold text-[#1E4D3A] transition hover:bg-white">Shop Now</Link></div><CampaignImage src={storefrontCampaign.image} mobileSrc={storefrontCampaign.mobileImage} placeholder="Festival Campaign Image" alt="LitePuff festive sale campaign" aspect="aspect-[16/9] md:aspect-auto md:min-h-[320px]" className="rounded-none border-0 bg-transparent" imageClassName="object-center md:object-[68%_center]" /></div></section>;
}

function Offer({ value, label }) {
  return <div className="min-w-[82px] border-l border-white/25 pl-3 first:border-0 first:pl-0"><strong className="block text-sm text-white">{value}</strong><span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[.07em] text-white/65">{label}</span></div>;
}
