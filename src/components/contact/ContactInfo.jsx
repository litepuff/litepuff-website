import { motion } from 'framer-motion';
import { FiClock, FiMail, FiMapPin, FiPhone } from 'react-icons/fi';
import { siteConfig } from '../../utils/siteConfig.js';

const contactDetails = [
  {
    title: 'Call Us',
    lines: [siteConfig.phone, `Available ${siteConfig.businessHours}`],
    icon: FiPhone,
    href: `tel:${siteConfig.phone.replace(/\s/g, '')}`,
  },
  {
    title: 'Email',
    lines: [siteConfig.email, "We'll reply within one business day."],
    icon: FiMail,
    href: `mailto:${siteConfig.email}`,
  },
  {
    title: 'Visit Us',
    lines: ['GN Enterprises', siteConfig.address],
    icon: FiMapPin,
  },
  {
    title: 'Working Hours',
    lines: [siteConfig.businessHours, 'India Standard Time'],
    icon: FiClock,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const staggerCards = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

export default function ContactInfo() {
  return (
    <div aria-labelledby="contact-information-title">
      <h2
        id="contact-information-title"
        className="font-display text-[30px] font-semibold tracking-[-0.04em] text-[#243029] md:text-[36px]"
      >
        Get in Touch
      </h2>
      <p className="mt-4 max-w-[500px] font-sans text-[15px] leading-[1.8] text-[#4E5550] md:text-base lg:text-[17px]">
        Choose the way that feels easiest. Our team is here for orders, products, partnerships and everyday questions.
      </p>

      {/* Contact information cards */}
      <motion.div
        className="mt-8 grid gap-4 sm:grid-cols-2"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerCards}
      >
        {contactDetails.map((detail) => {
          const Icon = detail.icon;
          const content = (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FAF8F2] text-[#C89B3C]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-display text-[22px] font-semibold text-[#243029]">{detail.title}</h3>
              <div className="mt-2 font-sans text-[14px] leading-6 text-[#4E5550] md:text-[15px]">
                {detail.lines.map((line, index) => (
                  <p key={line} className={index === 0 ? 'font-semibold text-[#243029]' : 'mt-1'}>
                    {line}
                  </p>
                ))}
              </div>
            </>
          );

          return (
            <motion.article
              key={detail.title}
              className="rounded-[20px] border border-[#ECE7DD] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.035)]"
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {detail.href ? (
                <a
                  href={detail.href}
                  className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C]"
                  aria-label={`${detail.title}: ${detail.lines[0]}`}
                >
                  {content}
                </a>
              ) : content}
            </motion.article>
          );
        })}
      </motion.div>
    </div>
  );
}
