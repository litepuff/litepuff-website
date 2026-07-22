import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function FeaturedStory({ article }) {
  return (
    <section className="border-t border-[#ECE7DD] py-16 md:py-20 lg:py-24" aria-labelledby="featured-story-title">
      <motion.div
        className="mx-auto grid max-w-7xl items-center gap-10 px-6 md:gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Magazine cover image */}
        <motion.div className="h-[340px] overflow-hidden rounded-[32px] bg-white sm:h-[420px] lg:h-[480px] lg:rounded-[36px]" variants={fadeUp}>
          <motion.img
            src={article.image}
            alt="A calm LitePuff snacking ritual featured in the Journal"
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </motion.div>

        {/* Featured story details */}
        <motion.article variants={fadeUp}>
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.3em] text-[#C89B3C]">
            Featured Story
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-sans text-[13px] text-[#4E5550]">
            <span className="font-semibold text-[#1E4D3A]">{article.category}</span>
            <span aria-hidden="true">/</span>
            <span>{article.readTime}</span>
            <span aria-hidden="true">/</span>
            <time dateTime="2026-06-28">{article.date}</time>
          </div>
          <h2
            id="featured-story-title"
            className="mt-5 max-w-[540px] font-display text-[32px] font-semibold leading-[1.12] tracking-[-0.04em] text-[#243029] md:text-[38px] lg:text-[44px]"
          >
            {article.title}
          </h2>
          <p className="mt-6 max-w-[560px] font-sans text-[15px] leading-[1.8] text-[#4E5550] md:text-base lg:text-[17px]">
            {article.excerpt}
          </p>
          <Link
            to={`/blog/${article.slug}`}
            className="group mt-7 inline-flex items-center gap-2 font-sans text-base font-semibold text-[#1E4D3A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C]"
          >
            Continue Reading
            <FiArrowRight className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </motion.article>
      </motion.div>
    </section>
  );
}
