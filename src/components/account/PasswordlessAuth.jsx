import { useRef, useState } from 'react';
import { FiArrowLeft, FiCheck, FiLoader, FiLock, FiMail, FiMessageCircle } from 'react-icons/fi';
import { customerService, apiMessage } from '../../services/customerService';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isPhone = (value) => /^(?:\+?91)?[6-9]\d{9}$/.test(value.replace(/[\s()-]/g, ''));

export default function PasswordlessAuth({ onComplete }) {
  const { completeAuthentication } = useCustomerAuth();
  const [step, setStep] = useState('identifier');
  const [identifier, setIdentifier] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refs = useRef([]);

  const submitIdentifier = async (event) => {
    event.preventDefault(); setError('');
    if (!isEmail(identifier) && !isPhone(identifier)) return setError('Enter a valid mobile number or email address.');
    setBusy(true);
    try { const result = await customerService.beginOtp(identifier); setChallenge({ ...result, identifier: identifier.trim() }); setStep('otp'); setTimeout(() => refs.current[0]?.focus(), 100); }
    catch (err) { setError(apiMessage(err)); } finally { setBusy(false); }
  };

  const verify = async (code = digits.join('')) => {
    if (code.length !== 6 || busy || !challenge) return;
    setBusy(true); setError('');
    try { const result = await customerService.verifyOtp(challenge, code); await completeAuthentication(result); setStep('complete'); onComplete?.(); }
    catch (err) { setError(apiMessage(err)); setDigits(Array(6).fill('')); refs.current[0]?.focus(); }
    finally { setBusy(false); }
  };

  const updateDigit = (index, value) => { const clean = value.replace(/\D/g, '').slice(-1); const next = [...digits]; next[index] = clean; setDigits(next); if (clean && index < 5) refs.current[index + 1]?.focus(); if (next.every(Boolean)) verify(next.join('')); };
  const paste = (event) => { const code = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6); if (code.length === 6) { event.preventDefault(); setDigits(code.split('')); verify(code); } };

  return <div className="w-full">
    {step !== 'identifier' && step !== 'complete' && <button type="button" onClick={() => { setStep('identifier'); setChallenge(null); setDigits(Array(6).fill('')); setError(''); }} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#5B5F59]"><FiArrowLeft /> Change details</button>}
    {step === 'identifier' && <form onSubmit={submitIdentifier}><label className="block text-sm font-semibold text-[#243029]" htmlFor="login-identifier">Mobile number or email</label><div className="mt-2 flex h-14 items-center rounded-2xl border border-[#DED8CC] bg-[#FCFBF8] px-4 focus-within:border-[#1E4D3A] focus-within:ring-4 focus-within:ring-[#1E4D3A]/10"><FiMail className="mr-3 text-[#9A7B3F]" /><input id="login-identifier" autoFocus autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Enter your mobile number or email" className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#969B97]" /></div><button disabled={busy} className="mt-5 flex h-14 w-full items-center justify-center rounded-full bg-[#1E4D3A] font-bold text-white disabled:opacity-60">{busy ? <FiLoader className="animate-spin" /> : 'Continue'}</button></form>}
    {step === 'otp' && <div className="min-w-0 text-center"><FiMessageCircle className="mx-auto text-[#C89B3C]" size={30} /><h2 className="mt-3 font-display text-2xl font-semibold">Check your {challenge?.provider === 'email' ? 'email' : 'WhatsApp'}</h2><p className="mt-2 break-words text-sm text-[#68706B]">Enter the 6-digit code sent to {challenge?.destination || identifier}.</p><div className="mt-6 grid w-full grid-cols-6 gap-1.5 sm:gap-2" onPaste={paste}>{digits.map((digit, index) => <input key={index} ref={(node) => { refs.current[index] = node; }} value={digit} inputMode="numeric" maxLength={1} aria-label={`OTP digit ${index + 1}`} onChange={(e) => updateDigit(index, e.target.value)} onKeyDown={(e) => { if (e.key === 'Backspace' && !digits[index] && index) refs.current[index - 1]?.focus(); }} className="h-12 min-w-0 w-full rounded-xl border border-[#DED8CC] text-center text-lg font-bold outline-none focus:border-[#1E4D3A] sm:h-14 sm:text-xl" />)}</div><button onClick={() => verify()} disabled={busy || digits.some((digit) => !digit)} className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-[#1E4D3A] font-bold text-white disabled:opacity-60">{busy ? <FiLoader className="animate-spin" /> : 'Verify & continue'}</button></div>}
    {step === 'complete' && <div className="py-5 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#E7EFE9] text-[#1E4D3A]"><FiCheck size={28} /></span><h2 className="mt-5 font-display text-2xl font-semibold">You are signed in</h2></div>}
    {error && <p role="alert" className="mt-4 rounded-2xl bg-[#FFF0EC] p-3 text-sm text-[#9A392F]">{error}</p>}
    <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-[#7B817D]"><FiLock /> Secure passwordless access powered by LitePuff</p>
  </div>;
}
