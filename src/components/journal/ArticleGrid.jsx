import { motion } from 'framer-motion';
import ArticleCard from './ArticleCard.jsx';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const staggerCards = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

export default function ArticleGrid({ articles, activeTopic }) {
  return (
    <section id="latest-stories" className="scroll-mt-28 border-t border-[#ECE7DD] py-16 md:py-20 lg:py-24" aria-labelledby="latest-stories-title">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Latest stories heading */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          variants={fadeUp}
        >
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.35em] text-[#C89B3C]">
            {activeTopic ? 'Selected Topic' : 'Latest Stories'}
          </p>
          <h2
            id="latest-stories-title"
            className="mt-5 font-display text-[34px] font-semibold tracking-[-0.04em] text-[#243029] md:text-[40px] lg:text-[48px]"
          >
            {activeTopic || 'Ideas Worth Keeping Close'}
          </h2>
        </motion.div>

        {/* Editorial masonry stories */}
        {articles.length > 0 ? (
          <motion.div
            key={activeTopic || 'all-stories'}
            className="mt-10 columns-1 gap-6 md:columns-2"
            initial="hidden"
            animate="visible"
            variants={staggerCards}
          >
            {articles.map((article) => (
              <motion.div key={article.id} className="break-inside-avoid" variants={fadeUp}>
                <ArticleCard article={article} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <p className="mt-10 font-sans text-base text-[#4E5550]">More stories on this topic are coming soon.</p>
        )}
      </div>
    </section>
  );
}
