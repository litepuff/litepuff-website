import { motion } from 'framer-motion';
import { Flame, Package, Star, Users } from 'lucide-react';
import avatarOne from '../assets/images/reviews/avatar-1.png';
import avatarTwo from '../assets/images/reviews/avatar-2.png';
import avatarThree from '../assets/images/reviews/avatar-3.png';

const testimonials = [
  { name: 'Priya Sharma', city: 'Delhi', review: 'Finally a healthy snack that actually tastes amazing. The Peri Peri flavour is my favourite.', avatar: avatarOne },
  { name: 'Rahul Mehta', city: 'Bengaluru', review: 'Crispy, light and perfect for office breaks. Much better than regular fried snacks.', avatar: avatarTwo },
  { name: 'Sneha Kapoor', city: 'Mumbai', review: 'The Cream & Onion flavour has become a family favourite. Fresh, crunchy and guilt-free.', avatar: avatarThree },
];

const statistics = [
  { value: '4.8', label: 'Average Rating', icon: Star },
  { value: '1000+', label: 'Happy Customers', icon: Users },
  { value: '5', label: 'Signature Flavours', icon: Package },
  { value: '100%', label: 'Roasted Goodness', icon: Flame },
];

const reveal = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

export default function CustomerReviews() {
  return (
    <section className="bg-white px-6 py-12 md:py-16 lg:px-8 lg:py-20" aria-labelledby="customer-reviews-title">
      <div className="mx-auto max-w-7xl">
        <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} aria-label="LitePuff trust statistics">
          {statistics.map(({ value, label, icon: Icon }) => <motion.article key={label} className="rounded-[22px] border border-[#E7E1D7] bg-[#FAF8F2] p-5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(36,48,41,0.06)]" variants={reveal}><div className="flex items-start justify-between gap-4"><div><p className="font-display text-[38px] font-semibold leading-none text-[#243029]">{value}</p><p className="mt-2 text-sm font-medium text-[#5F6762]">{label}</p></div><Icon className="h-6 w-6 text-[#C89B3C]" strokeWidth={1.5} aria-hidden="true" /></div></motion.article>)}
        </motion.div>

        <motion.header className="mx-auto mt-12 max-w-[720px] text-center md:mt-16" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={reveal}>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C89B3C]">Customer Stories</p>
          <h2 id="customer-reviews-title" className="mt-3 font-display text-[44px] font-semibold leading-none tracking-[-0.04em] text-[#243029] md:text-[48px]">Loved by Everyday Snackers</h2>
          <p className="mx-auto mt-4 max-w-[620px] text-lg leading-8 text-[#5F6762] md:text-xl">Real feedback from customers who have made LitePuff part of their everyday routine.</p>
        </motion.header>

        <motion.div className="mt-9 grid gap-5 md:grid-cols-3" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.12 }} variants={stagger}>
          {testimonials.map((testimonial) => <motion.article key={testimonial.name} className="flex h-full flex-col rounded-[26px] border border-[#E7E1D7] bg-white p-6 shadow-[0_8px_24px_rgba(36,48,41,0.035)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(36,48,41,0.07)]" variants={reveal}><div className="flex items-center gap-4"><img src={testimonial.avatar} alt={`${testimonial.name}, verified LitePuff customer`} className="h-14 w-14 rounded-full object-cover" loading="lazy" decoding="async" /><div><h3 className="font-display text-[23px] font-semibold leading-tight text-[#243029]">{testimonial.name}</h3><p className="text-sm text-[#68706B]">{testimonial.city}</p></div></div><div className="mt-5 flex text-[#C89B3C]" aria-label="5 out of 5 stars">{Array.from({ length: 5 }, (_, index) => <Star key={index} className="h-4 w-4 fill-current" aria-hidden="true" />)}</div><blockquote className="mt-4 flex-1 text-base leading-7 text-[#4E5550]">&ldquo;{testimonial.review}&rdquo;</blockquote><p className="mt-6 inline-flex w-fit items-center rounded-full bg-[#EEF3EE] px-3 py-1.5 text-xs font-semibold text-[#1E4D3A]">✓ Verified Purchase</p></motion.article>)}
        </motion.div>
      </div>
    </section>
  );
}
