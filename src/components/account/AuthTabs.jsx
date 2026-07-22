import { motion } from 'framer-motion';

export default function AuthTabs({ active, onChange }) {
  return (
    <div className="relative grid min-h-12 grid-cols-2 rounded-full bg-[#F1EEE6] p-1.5" role="tablist" aria-label="Account access">
      {['signin', 'register'].map((tab) => (
        <button key={tab} type="button" role="tab" aria-selected={active === tab} onClick={() => onChange(tab)} className="relative z-10 h-10 rounded-full px-4 text-sm font-semibold text-[#243029] outline-none transition-colors duration-300 hover:text-[#1E4D3A] focus-visible:ring-2 focus-visible:ring-[#C89B3C] focus-visible:ring-offset-2">
          {active === tab && <motion.span layoutId="auth-tab" className="absolute inset-0 -z-10 rounded-full bg-white shadow-[0_3px_12px_rgba(36,48,41,0.08)]" transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />}
          {tab === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      ))}
    </div>
  );
}
