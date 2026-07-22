import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function TopicsBanner({ image }) {
  return (
    <section className="border-t border-[#ECE7DD] pt-16 md:pt-20 lg:pt-24" aria-labelledby="browse-topics-title">
      <motion.div
        className="mx-auto max-w-7xl px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={fadeUp}
      >
        {/* Uninterrupted editorial banner */}
        <div className="h-[220px] overflow-hidden rounded-[28px] bg-white sm:h-[270px] lg:h-[320px] lg:rounded-[32px]">
          <motion.img
            src={image}
            alt="A collection of thoughtful LitePuff Journal themes"
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <div className="mt-10 text-center">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.35em] text-[#C89B3C]">
            Explore the Journal
          </p>
          <h2
            id="browse-topics-title"
            className="mt-4 font-display text-[34px] font-semibold tracking-[-0.04em] text-[#243029] md:text-[40px] lg:text-[48px]"
          >
            Browse Topics
          </h2>
        </div>
      </motion.div>
    </section>
  );
}
