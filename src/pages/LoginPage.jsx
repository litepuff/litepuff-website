import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import PasswordlessAuth from '../components/account/PasswordlessAuth.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import logo from '../assets/images/logo.png';

export default function LoginPage() {
  const { customer, loading } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from || '/profile';

  useEffect(() => {
    if (customer) navigate(destination, { replace: true });
  }, [customer, destination, navigate]);

  return (
    <>
      <Seo title="Sign in" description="Secure passwordless LitePuff account access." path="/login" />
      <section className="grid min-h-[calc(100svh-5rem)] place-items-center bg-[#FAF8F2] px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[500px] rounded-[32px] border border-[#EAE5DB] bg-white p-7 shadow-[0_24px_70px_rgba(36,48,41,.1)] sm:p-11">
          <img src={logo} alt="LitePuff" className="mx-auto h-20 w-auto" />
          <div className="mb-8 mt-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[.24em] text-[#A0782F]">Welcome to LitePuff</p>
            <h1 className="mt-2 font-display text-4xl font-semibold text-[#243029]">{loading ? 'Restoring your session…' : 'Your account, in seconds.'}</h1>
            <p className="mt-3 text-sm leading-6 text-[#68706B]">{loading ? 'Checking this remembered device securely.' : 'No password. We’ll only request an OTP when this device needs verification.'}</p>
          </div>
          {loading
            ? <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#D8E2DB] border-t-[#1E4D3A]" role="status" aria-label="Restoring session" />
            : <PasswordlessAuth onComplete={() => navigate(destination, { replace: true })} />}
        </motion.div>
      </section>
    </>
  );
}
