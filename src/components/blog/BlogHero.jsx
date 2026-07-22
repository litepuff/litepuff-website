import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function BlogHero({ article }) {
  return (
    <header>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#747B76]" aria-label="Breadcrumb">
        <Link to="/" className="transition-colors hover:text-[#1E4D3A]">Home</Link><span aria-hidden="true">/</span>
        <Link to="/blog" className="transition-colors hover:text-[#1E4D3A]">Journal</Link><span aria-hidden="true">/</span>
        <span className="min-w-0 truncate text-[#243029]" aria-current="page">{article.title}</span>
      </nav>

      {/* Article header */}
      <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="mx-auto mt-10 max-w-[760px] text-center">
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.18em]">
          <span className="rounded-full border border-[#E1D4B8] bg-white px-4 py-2 text-[#A77720]">{article.category}</span>
          <span className="text-[#747B76]">{article.readTime}</span><span className="h-1 w-1 rounded-full bg-[#C89B3C]" aria-hidden="true" />
          <time className="text-[#747B76]">{article.published}</time>
        </div>
        <h1 className="mt-6 font-display text-[36px] font-semibold leading-[1.02] tracking-[-0.04em] text-[#243029] md:text-[46px] lg:text-[56px]">{article.title}</h1>
        <p className="mx-auto mt-6 max-w-[700px] text-base leading-[1.8] text-[#5B625D] md:text-[17px]">{article.introduction}</p>
      </motion.div>

      {/* Cinematic hero image */}
      <motion.figure initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }} className="group mt-10 h-[320px] overflow-hidden rounded-[32px] shadow-[0_18px_48px_rgba(36,48,41,0.08)] sm:h-[420px] lg:h-[520px]">
        <img src={article.heroImage} alt={`Editorial feature for ${article.title}`} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
      </motion.figure>
    </header>
  );
}
