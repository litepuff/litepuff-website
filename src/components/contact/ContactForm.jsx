import { useState } from 'react';
import { motion } from 'framer-motion';
import { contentService } from '../../services/contentService';
import { useToast } from '../../context/ToastContext';

const subjectOptions = ['Order Query', 'Bulk Order', 'Feedback', 'Other'];

function FieldLabel({ htmlFor, children, required = false }) {
  return (
    <label className="mb-2 block font-sans text-[14px] font-semibold text-[#243029]" htmlFor={htmlFor}>
      {children}
      {required ? (
        <>
          <span className="ml-1 text-[#C89B3C]" aria-hidden="true">*</span>
          <span className="sr-only"> (required)</span>
        </>
      ) : null}
    </label>
  );
}

const inputClasses = 'h-[52px] w-full rounded-[18px] border border-[#ECE7DD] bg-white px-4 font-sans text-[15px] text-[#243029] outline-none transition-colors duration-300 placeholder:text-[#4E5550]/60 focus:border-[#1E4D3A] focus-visible:ring-2 focus-visible:ring-[#1E4D3A]/15';

export default function ContactForm() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setLoading(true);
    setStatus('');
    try {
      await contentService.contact({ name: formData.get('fullName'), email: formData.get('email'), phone: formData.get('phone'), subject: formData.get('subject'), message: formData.get('message') });
      form.reset();
      setStatus('Message received. We’ll get back to you shortly.');
      showToast('Message sent successfully.');
    } catch {
      setStatus('Unable to send your message. Please try again.');
      showToast('Unable to send message.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div aria-labelledby="contact-form-title">
      <h2
        id="contact-form-title"
        className="font-display text-[30px] font-semibold tracking-[-0.04em] text-[#243029] md:text-[36px]"
      >
        Send Us a Message
      </h2>
      <p className="mt-4 max-w-[500px] font-sans text-[15px] leading-[1.8] text-[#4E5550] md:text-base lg:text-[17px]">
        Tell us what you need and we&apos;ll make sure your note reaches the right person.
      </p>

      {/* Accessible contact form */}
      <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="contact-name" required>Full Name</FieldLabel>
            <input id="contact-name" name="fullName" type="text" autoComplete="name" required className={inputClasses} />
          </div>
          <div>
            <FieldLabel htmlFor="contact-email" required>Email Address</FieldLabel>
            <input id="contact-email" name="email" type="email" autoComplete="email" required className={inputClasses} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="contact-phone">Phone Number</FieldLabel>
            <input id="contact-phone" name="phone" type="tel" autoComplete="tel" className={inputClasses} />
          </div>
          <div>
            <FieldLabel htmlFor="contact-subject" required>Subject</FieldLabel>
            <select id="contact-subject" name="subject" required defaultValue="" className={`${inputClasses} cursor-pointer`}>
              <option value="" disabled>Select a subject</option>
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="contact-message" required>Message</FieldLabel>
          <textarea
            id="contact-message"
            name="message"
            required
            className="h-[180px] w-full resize-y rounded-[18px] border border-[#ECE7DD] bg-white px-4 py-4 font-sans text-[15px] leading-7 text-[#243029] outline-none transition-colors duration-300 placeholder:text-[#4E5550]/60 focus:border-[#1E4D3A] focus-visible:ring-2 focus-visible:ring-[#1E4D3A]/15"
            placeholder="How can we help?"
          />
        </div>

        <div>
          <motion.button
            type="submit"
            className="inline-flex h-[52px] w-full items-center justify-center rounded-full bg-[#1E4D3A] px-[32px] font-sans text-base font-semibold text-white transition-colors duration-300 hover:bg-[#2C614A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C] sm:w-auto"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Sending…' : 'Send Message'}
          </motion.button>
          <p className="mt-3 font-sans text-[13px] text-[#4E5550]" aria-live="polite">{status}</p>
        </div>
      </form>
    </div>
  );
}
