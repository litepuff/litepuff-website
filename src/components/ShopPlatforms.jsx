import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Store } from 'lucide-react';

const platforms = [
  { name: 'DigiHaat', href: 'https://digihaat.in/digilink/purbwfl51C' },
  { name: 'MyStore', href: 'https://www.mystore.in/en/seller/d3a9b4a6398520aa57b740fede013dc9' },
  { name: 'HamaraMall', href: 'https://hamaramall.com/providers/DSF4DFD09FD?loc_id=284364' },
];

export default function ShopPlatforms() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="bg-white px-5 py-14 sm:px-6 md:py-16 lg:px-10" aria-labelledby="shop-platforms-title">
      <div className="mx-auto max-w-7xl">
        <motion.header className="grid gap-4 border-b border-[#E0D8CC] pb-7 md:grid-cols-[1fr_.8fr] md:items-end" initial={reduceMotion ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .4 }}>
          <div><p className="text-xs font-bold uppercase tracking-[.28em] text-[#A97826]">Shop LitePuff Where You Like</p><h2 id="shop-platforms-title" className="mt-3 font-display text-[40px] font-semibold leading-none tracking-[-.035em] text-[#243029] sm:text-5xl">Find LitePuff on your favourite shopping platforms.</h2></div>
          <p className="max-w-xl text-base leading-7 text-[#606862] md:justify-self-end">Choose the marketplace that works best for you.</p>
        </motion.header>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {platforms.map((platform) => <motion.a key={platform.name} href={platform.href} target="_blank" rel="noopener noreferrer" whileHover={reduceMotion ? undefined : { y: -3 }} className="group flex min-h-28 items-center justify-between rounded-[16px] border border-[#E4DDD1] bg-[#FAF8F2] p-5 transition-colors hover:border-[#C7B99F] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E4D3A]" aria-label={`Shop LitePuff on ${platform.name} (opens in a new tab)`}>
            <span className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full border border-[#DED4C4] bg-white text-[#A97826]"><Store className="h-5 w-5" aria-hidden="true" /></span><strong className="font-display text-2xl font-semibold text-[#243029]">{platform.name}</strong></span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1E4D3A]">Shop Now <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" /></span>
          </motion.a>)}
        </div>
      </div>
    </section>
  );
}
