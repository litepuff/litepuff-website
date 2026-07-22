import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function RelatedArticles({ articles }) {
  return (
    <section className="mt-16 border-t border-[#E4DED3] pt-14 md:mt-20 md:pt-16">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C89B3C]">From the journal</p>
      <h2 className="mt-2 font-display text-[38px] font-semibold leading-none tracking-[-0.03em] text-[#243029]">Continue Reading</h2>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }} className="mt-8 grid gap-6 md:grid-cols-3">
        {articles.map((article) => (
          <motion.article key={article.slug} variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }} whileHover={{ y: -6 }} transition={{ duration: 0.3 }} className="group overflow-hidden rounded-3xl border border-[#ECE7DD] bg-white shadow-[0_10px_30px_rgba(36,48,41,0.04)]">
            <Link to={`/blog/${article.slug}`} className="block h-full">
              <div className="h-52 overflow-hidden"><img src={article.image} alt={article.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /></div>
              <div className="p-5"><div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.16em]"><span className="text-[#C89B3C]">{article.category}</span><span className="text-[#7A817C]">{article.readTime}</span></div><h3 className="mt-4 font-display text-[25px] font-semibold leading-[1.15] tracking-[-0.025em] text-[#243029] transition-colors group-hover:text-[#1E4D3A]">{article.title}</h3></div>
            </Link>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}
