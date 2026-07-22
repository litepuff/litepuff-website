import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function SnackInspiration({ image }) {
  return (
    <section className="border-t border-[#ECE7DD] py-16 md:py-20 lg:py-24" aria-labelledby="snack-inspiration-title">
      <motion.div
        className="mx-auto grid max-w-7xl items-center gap-10 px-6 md:gap-12 lg:grid-cols-2 lg:gap-16 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Everyday snack inspiration image */}
        <motion.div className="h-[340px] overflow-hidden rounded-[32px] bg-white sm:h-[410px] lg:h-[460px]" variants={fadeUp}>
          <motion.img
            src={image}
            alt="LitePuff bringing a little more joy to an everyday snack break"
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </motion.div>

        {/* Product discovery invitation */}
        <motion.div variants={fadeUp}>
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.35em] text-[#C89B3C]">
            Snack Inspiration
          </p>
          <h2
            id="snack-inspiration-title"
            className="mt-5 max-w-[680px] font-display text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#243029] md:text-[40px] lg:text-[48px]"
          >
            Bring More Joy
            <br />
            To Everyday Snacking.
          </h2>
          <p className="mt-6 max-w-[560px] font-sans text-[15px] leading-[1.8] text-[#4E5550] md:text-base lg:text-[17px]">
            Whether you&apos;re enjoying a quiet tea break, working through a busy afternoon or travelling somewhere new, LitePuff is crafted to make every snack a little more enjoyable.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/products"
                className="inline-flex h-[52px] w-full items-center justify-center rounded-full bg-[#1E4D3A] px-[30px] font-sans text-base font-semibold text-white transition-colors duration-300 hover:bg-[#2C614A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C]"
              >
                Explore Products
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/products#flavours"
                className="inline-flex h-[52px] w-full items-center justify-center rounded-full border border-[#1E4D3A] px-[30px] font-sans text-base font-semibold text-[#1E4D3A] transition-colors duration-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C]"
              >
                View Collection
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
