import { CreditCard, PackageCheck, Truck } from 'lucide-react';

const items = [
  { icon: Truck, title: 'Free Delivery', text: 'Secure checkout' },
  { icon: CreditCard, title: 'Secure Payments', text: 'Safe and easy checkout' },
  { icon: PackageCheck, title: 'Freshly Packed', text: 'Packed with care' },
];

export default function TrustStrip() {
  return <section className="border-y border-[#DED6C9] bg-[#FAF8F2] px-5 sm:px-6 lg:px-10" aria-label="Shopping assurances"><div className="mx-auto grid max-w-7xl sm:grid-cols-3">{items.map(({ icon: Icon, title, text }) => <div key={title} className="flex items-center gap-3 border-b border-[#DED6C9] py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-6 first:sm:pl-0 last:sm:border-r-0 last:sm:pr-0"><Icon size={20} strokeWidth={1.4} className="text-[#A97826]" aria-hidden="true" /><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#243029]">{title}</p><p className="mt-0.5 text-xs text-[#6A716C]">{text}</p></div></div>)}</div></section>;
}
