import { motion } from 'framer-motion';

const staggerPills = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function TopicPills({ topics, activeTopic, onTopicSelect }) {
  return (
    <section className="pb-16 pt-8 md:pb-20 md:pt-10 lg:pb-24" aria-label="Journal topics">
      <motion.div
        className="mx-auto flex max-w-5xl flex-wrap justify-center gap-3 px-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        variants={staggerPills}
      >
        {topics.map((topic) => {
          const isActive = activeTopic === topic;

          return (
            <motion.button
              key={topic}
              type="button"
              className={`h-11 rounded-full border px-5 font-sans text-[14px] font-semibold transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C] ${
                isActive
                  ? 'border-[#1E4D3A] bg-[#1E4D3A] text-white'
                  : 'border-[#ECE7DD] bg-white text-[#243029] hover:border-[#1E4D3A] hover:bg-[#1E4D3A] hover:text-white'
              }`}
              variants={fadeUp}
              whileTap={{ scale: 0.98 }}
              aria-pressed={isActive}
              onClick={() => onTopicSelect(isActive ? null : topic)}
            >
              {topic}
            </motion.button>
          );
        })}
      </motion.div>
    </section>
  );
}
