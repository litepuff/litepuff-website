import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function GoogleMap() {
  return (
    <section className="border-t border-[#ECE7DD] py-16 md:py-20 lg:py-24" aria-labelledby="find-us-title">
      <motion.div
        className="mx-auto max-w-7xl px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={fadeUp}
      >
        {/* Map introduction */}
        <div className="text-center">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.35em] text-[#C89B3C]">
            Our Location
          </p>
          <h2
            id="find-us-title"
            className="mt-5 font-display text-[34px] font-semibold tracking-[-0.04em] text-[#243029] md:text-[40px] lg:text-[48px]"
          >
            Find Us
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] font-sans text-[15px] leading-[1.8] text-[#4E5550] md:text-base lg:text-[17px]">
            Visit our office or warehouse in New Delhi.
          </p>
        </div>

        {/* Responsive Google Map */}
        <div className="mt-10 h-[360px] overflow-hidden rounded-[28px] border border-[#ECE7DD] bg-white sm:h-[440px] lg:h-[520px] lg:rounded-[32px]">
          <iframe
            title="LitePuff Foods location in New Delhi, India"
            src="https://www.google.com/maps?q=New%20Delhi%2C%20India&output=embed"
            className="h-full w-full border-0"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </motion.div>
    </section>
  );
}
