import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function JournalIntro({ image }) {
  return (
    <section className="py-16 md:py-20 lg:py-24" aria-labelledby="journal-title">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 md:gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8">
        {/* Compact journal introduction */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.35em] text-[#C89B3C]">
            The LitePuff Journal
          </p>
          <h1
            id="journal-title"
            className="mt-5 max-w-[680px] font-display text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#243029] md:text-[40px] lg:text-[48px]"
          >
            Thoughtful Stories,
            <br />
            Better Snacking,
            <br />
            Everyday Inspiration.
          </h1>
          <p className="mt-6 max-w-[560px] font-sans text-[15px] leading-[1.8] text-[#4E5550] md:text-base lg:text-[17px]">
            Discover recipes, healthy snacking ideas, everyday routines and thoughtful stories crafted to inspire a lighter way of enjoying every snack.
          </p>
        </motion.div>

        {/* Editorial introduction image */}
        <motion.div
          className="h-[300px] overflow-hidden rounded-[32px] bg-white sm:h-[340px] lg:h-[360px]"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <motion.img
            src={image}
            alt="LitePuff Journal stories inspired by thoughtful everyday snacking"
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </motion.div>
      </div>
    </section>
  );
}
