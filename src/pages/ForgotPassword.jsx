import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheck } from 'react-icons/fi';
import Seo from '../components/Seo.jsx';
import FormField from '../components/account/FormField.jsx';
import { apiMessage, customerService } from '../services/customerService.js';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import logo from '../assets/images/logo.png';

export default function ForgotPassword() {
  const input = null;
  const [email, setEmail] = useState(''); const [otp, setOtp] = useState(''); const [challenge, setChallenge] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const { completeAuthentication } = useCustomerAuth(); const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid registered email address.');
    if (challenge && !/^\d{6}$/.test(otp)) return setError('Enter the 6-digit verification code.');
    setLoading(true); setError('');
    try {
      if (!challenge) { const result = await customerService.recover({ method: 'email', email }); setChallenge(result); }
      else { const result = await customerService.recover({ method: 'email', email, otpId: challenge.otpId, otp }); await completeAuthentication(result); navigate('/profile', { replace: true }); }
    } catch (err) { setError(apiMessage(err)); } finally { setLoading(false); }
  }
  return <><Seo title="Account recovery" description="Recover your LitePuff account securely." path="/forgot-password" /><section className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-[#FAF8F2] px-5 py-14"><div className="w-full max-w-[500px] rounded-[32px] border border-[#ECE7DD] bg-white p-7 shadow-soft sm:p-10"><img src={logo} alt="LitePuff" className="mb-6 h-14 w-auto" /><p className="text-[11px] font-bold tracking-[.22em] text-[#9A7430]">ACCOUNT RECOVERY</p><h1 className="mt-2 text-4xl font-semibold text-[#243029]">Verify your email</h1><p className="mb-7 mt-3 text-sm leading-6 text-[#68706B]">{challenge ? `Enter the code sent to ${challenge.destination}.` : 'We will send a one-time recovery code to your verified email.'}</p><form onSubmit={submit} className="grid gap-5"><FormField label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={Boolean(challenge)} autoComplete="email" placeholder="you@example.com" />{challenge && <FormField ref={input} label="6-digit code" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" placeholder="000000" />}{error && <p role="alert" className="text-sm text-[#9A392F]">{error}</p>}<button disabled={loading} className="flex h-13 items-center justify-center gap-2 rounded-full bg-[#1E4D3A] font-semibold text-white disabled:opacity-60">{challenge && <FiCheck />}{loading ? 'Please wait…' : challenge ? 'Verify & recover' : 'Send recovery code'}</button></form><Link to="/login" className="mt-7 flex items-center justify-center gap-2 text-sm font-semibold text-[#1E4D3A]"><FiArrowLeft /> Back to sign in</Link></div></section></>;
}
