import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function ContactIntro() {
  return (
    <section className="py-16 text-center md:py-20 lg:py-24" aria-labelledby="contact-title">
      <motion.div
        className="mx-auto max-w-7xl px-6 lg:px-8"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
      >
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.35em] text-[#C89B3C]">
          Contact
        </p>
        <h1
          id="contact-title"
          className="mx-auto mt-5 max-w-[680px] font-display text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#243029] md:text-[40px] lg:text-[48px]"
        >
          Let&apos;s Start
          <br />
          A Conversation.
        </h1>
        <p className="mx-auto mt-6 max-w-[620px] font-sans text-[15px] leading-[1.8] text-[#4E5550] md:text-base lg:text-[17px]">
          Have a question about an order, a flavour, or want to talk bulk gifting for your office? We read every message ourselves — no chatbot loop.
        </p>
      </motion.div>
    </section>
  );
}
