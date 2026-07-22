import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiChevronDown, FiSearch } from 'react-icons/fi';
import { contentService } from '../../services/contentService';

const questions = [
  {
    question: 'How long does it take to receive a reply?',
    answer: 'We usually reply within one business day. Messages received on Sundays or public holidays are handled on the next working day.',
  },
  {
    question: 'Do you offer bulk orders?',
    answer: 'Yes. We can help with office snacking, events, festive gifting and other larger requirements. Select Bulk Order in the form and share what you have in mind.',
  },
  {
    question: 'Where do you currently deliver?',
    answer: 'LitePuff currently delivers across India. Exact delivery availability and timing are confirmed when you enter your address during checkout.',
  },
  {
    question: 'Can I become a distributor?',
    answer: 'We welcome thoughtful distribution enquiries. Choose Other in the form and include your city, business details and the areas you currently serve.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function QuickFAQ() {
  const [openIndex, setOpenIndex] = useState(0);
  const [items, setItems] = useState(questions);
  const [search, setSearch] = useState('');
  useEffect(() => {
    contentService.faqs().then((data) => {
      if (data.faqs?.length) setItems(data.faqs);
    }).catch(() => {});
  }, []);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => [item.question, item.answer, item.category].join(' ').toLowerCase().includes(q));
  }, [items, search]);

  return (
    <section className="border-t border-[#ECE7DD] py-16 md:py-20 lg:py-24" aria-labelledby="quick-questions-title">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        {/* Compact FAQ heading */}
        <motion.div
          className="text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          variants={fadeUp}
        >
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.35em] text-[#C89B3C]">
            Helpful Details
          </p>
          <h2
            id="quick-questions-title"
            className="mt-5 font-display text-[34px] font-semibold tracking-[-0.04em] text-[#243029] md:text-[40px] lg:text-[48px]"
          >
            Quick Questions
          </h2>
        </motion.div>
        <label className="relative mt-8 block">
          <span className="sr-only">Search FAQs</span>
          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-[#1E4D3A]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions..." className="h-12 w-full rounded-full border border-[#ECE7DD] bg-white pl-12 pr-5 text-sm outline-none focus:border-[#1E4D3A]" />
        </label>

        {/* Editorial accordion */}
        <motion.div
          className="mt-10 space-y-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
        >
          {visible.map((item, index) => {
            const isOpen = openIndex === index;
            const buttonId = `quick-question-${index}`;
            const panelId = `quick-answer-${index}`;

            return (
              <motion.article
                key={item.question}
                className="overflow-hidden rounded-[20px] border border-[#ECE7DD] bg-white"
                variants={fadeUp}
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#C89B3C] sm:px-6"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  >
                    <span className="font-sans text-[16px] font-semibold text-[#243029] md:text-[17px]">
                      {item.question}
                    </span>
                    <motion.span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ECE7DD] text-[#1E4D3A]"
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                      <FiChevronDown aria-hidden="true" />
                    </motion.span>
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <p className="max-w-[680px] px-5 pb-5 font-sans text-[15px] leading-[1.8] text-[#4E5550] sm:px-6 sm:pb-6 md:text-base">
                        {item.answer}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.article>
            );
          })}
          {!visible.length && <div className="rounded-[20px] border border-[#ECE7DD] bg-white p-8 text-center text-[#4E5550]">No FAQ results found.</div>}
        </motion.div>
      </div>
    </section>
  );
}
