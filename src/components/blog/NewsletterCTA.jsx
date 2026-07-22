import { useState } from 'react';

export default function NewsletterCTA() {
  const [email, setEmail] = useState('');
  return (
    <section className="mt-14 rounded-[28px] border border-[#ECE7DD] bg-white p-6 text-center shadow-[0_12px_36px_rgba(36,48,41,0.04)] sm:p-9 md:mt-16">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#C89B3C]">LitePuff Letters</p>
      <h2 className="mt-3 font-display text-[36px] font-semibold leading-none tracking-[-0.03em] text-[#243029]">Never Miss a Story</h2>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#5B625D]">Receive thoughtful stories, snack inspiration and LitePuff updates.</p>
      <form onSubmit={(event) => event.preventDefault()} className="mx-auto mt-6 flex max-w-xl flex-col gap-3 sm:flex-row">
        <label htmlFor="journal-email" className="sr-only">Email address</label>
        <input id="journal-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" className="h-[52px] min-w-0 flex-1 rounded-full border border-[#ECE7DD] bg-[#FAF8F2] px-5 text-sm outline-none placeholder:text-[#929793] focus:border-[#1E4D3A]" />
        <button type="submit" className="h-[52px] rounded-full bg-[#1E4D3A] px-7 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#2C614A]">Subscribe</button>
      </form>
    </section>
  );
}
