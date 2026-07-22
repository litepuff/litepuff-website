import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';

const cardStates = {
  rest: { y: 0 },
  hover: { y: -6, transition: { duration: 0.3, ease: 'easeOut' } },
};

const imageStates = {
  rest: { scale: 1 },
  hover: { scale: 1.03, transition: { duration: 0.3, ease: 'easeOut' } },
};

const titleStates = {
  rest: { color: '#243029' },
  hover: { color: '#1E4D3A', transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function ArticleCard({ article }) {
  const imageHeight = article.imageHeight === 'large'
    ? 'h-[300px] sm:h-[360px]'
    : 'h-[250px] sm:h-[285px]';

  return (
    <motion.div className="mb-6 inline-block w-full break-inside-avoid" initial="rest" whileHover="hover" animate="rest" variants={cardStates}>
      <Link
        to={`/blog/${article.slug}`}
        className="block cursor-pointer rounded-[28px] border border-[#ECE7DD] bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C] sm:p-6"
        aria-label={`Read ${article.title}`}
      >
        <article>
          <div className={`overflow-hidden rounded-[22px] bg-[#FAF8F2] ${imageHeight}`}>
            <motion.img
              src={article.image}
              alt={`Editorial image for ${article.title}`}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              variants={imageStates}
            />
          </div>

          <div className="pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 font-sans text-[13px]">
              <span className="font-semibold uppercase tracking-[0.18em] text-[#C89B3C]">{article.category}</span>
              <span className="text-[#4E5550]">{article.readTime}</span>
            </div>
            <motion.h3 className="mt-4 max-w-[460px] font-display text-[22px] font-semibold leading-[1.3] md:text-[24px] lg:text-[28px]" variants={titleStates}>
              {article.title}
            </motion.h3>
            <p className="mt-4 max-w-[560px] font-sans text-[15px] leading-[1.8] text-[#4E5550] md:text-base lg:text-[17px]">
              {article.excerpt}
            </p>
            <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#ECE7DD] pt-5">
              <time className="font-sans text-[13px] text-[#4E5550]">{article.date}</time>
              <FiArrowRight className="h-5 w-5 text-[#1E4D3A]" aria-hidden="true" />
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
