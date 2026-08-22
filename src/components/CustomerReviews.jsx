import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Image, Play, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { reviewService } from '../services/reviewService';
import { useProducts } from '../hooks/useProducts';

export default function CustomerReviews() {
  const { products } = useProducts();
  const reduceMotion = useReducedMotion();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!products.length) return;
    let current = true;
    Promise.allSettled(products.map((product) => reviewService.list(product.id, { limit: 4, sort: 'helpful' }).then((result) => (result.reviews || []).map((review) => ({ ...review, productName: product.name })))))
      .then((results) => { if (current) setReviews(results.flatMap((result) => result.status === 'fulfilled' ? result.value : []).slice(0, 8)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [products]);

  const average = useMemo(() => reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length : 0, [reviews]);
  return <section className="bg-[#FAF8F2] px-5 py-14 sm:px-6 md:py-20 lg:px-10" aria-labelledby="customer-reviews-title">
    <div className="mx-auto max-w-7xl">
      <motion.header className="max-w-3xl" initial={reduceMotion ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .4 }}>
        <p className="text-xs font-bold uppercase tracking-[.28em] text-[#A97826]">Customer Love</p>
        <h2 id="customer-reviews-title" className="mt-3 font-display text-[40px] font-semibold leading-none tracking-[-.035em] text-[#243029] sm:text-5xl">Good snacks. Great reactions.</h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-[#606862]">See why snack lovers are making LitePuff part of their everyday cravings.</p>
        {reviews.length > 0 && <div className="mt-4 flex items-center gap-3"><div className="flex text-[#C89B3C]" aria-label={`${average.toFixed(1)} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={18} className={index < Math.round(average) ? 'fill-current' : ''} aria-hidden="true" />)}</div><span className="text-sm font-semibold text-[#4E5550]">{average.toFixed(1)} from published reviews</span></div>}
      </motion.header>
      {loading ? <div className="mt-8 flex gap-4 overflow-hidden" aria-label="Loading customer reviews">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-80 min-w-[82%] animate-pulse rounded-[22px] bg-white sm:min-w-[360px]" />)}</div> : reviews.length ? <div className="scrollbar-hidden mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">{reviews.map((review, index) => <ReviewCard key={review.id || index} review={review} reduceMotion={reduceMotion} />)}</div> : <EmptyReviews />}
      <Link to="/products" className="mt-7 inline-flex border-b border-[#1E4D3A] pb-1 text-sm font-bold text-[#1E4D3A]">Read All Reviews →</Link>
    </div>
  </section>;
}

function ReviewCard({ review, reduceMotion }) {
  const image = review.images?.[0]?.thumbnail || review.images?.[0]?.url || review.customerPhoto;
  return <motion.article className="min-w-[84%] snap-start overflow-hidden border-y border-[#DCD3C5] bg-transparent sm:min-w-[360px] lg:min-w-[390px]" initial={reduceMotion ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }}>
    {(image || review.video) && <div className="relative aspect-[4/3] overflow-hidden bg-[#F0EBE2]">{image ? <img src={image} alt="Customer-submitted LitePuff review" className="h-full w-full object-cover" loading="lazy" /> : <video src={review.video} className="h-full w-full object-cover" preload="metadata" aria-label="Customer-submitted LitePuff review video" />} {review.video && <span className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-white text-[#1E4D3A]"><Play size={17} fill="currentColor" aria-hidden="true" /></span>}</div>}
    <div className="p-5"><div className="flex text-[#C89B3C]" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} className={index < Number(review.rating) ? 'fill-current' : ''} aria-hidden="true" />)}</div>{review.title && <h3 className="mt-3 font-display text-2xl font-semibold text-[#243029]">{review.title}</h3>}<p className="mt-2 line-clamp-4 text-sm leading-6 text-[#56605A]">{review.review}</p><div className="mt-5 border-t border-[#EEE8DE] pt-4">{review.customerName && <p className="text-sm font-bold text-[#243029]">{review.customerName}</p>}<p className="mt-0.5 text-xs text-[#747B76]">{review.productName}</p></div></div>
  </motion.article>;
}

function EmptyReviews() {
  return <div className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Customer review content awaiting publication">{Array.from({ length: 3 }, (_, index) => <div key={index} className="grid min-h-56 place-items-center rounded-[22px] border border-dashed border-[#CEC5B7] bg-white p-6 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#F3EFE7] text-[#1E4D3A]"><Image size={19} aria-hidden="true" /></span><p className="mt-4 text-sm font-bold text-[#243029]">Customer story slot</p><p className="mt-1 text-xs leading-5 text-[#747B76]">Approved customer photos, videos and reviews will appear here.</p></div></div>)}</div>;
}
