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
      <Seo title="Sign in" description="Sign in securely to manage your LitePuff orders, addresses and account." path="/login" />
      <section className="grid min-h-[calc(100svh-5rem)] place-items-center overflow-x-hidden bg-[#FAF8F2] px-3 py-8 sm:px-4 sm:py-10">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full min-w-0 max-w-[500px] rounded-[28px] border border-[#EAE5DB] bg-white p-5 shadow-[0_24px_70px_rgba(36,48,41,.1)] min-[375px]:p-7 sm:rounded-[32px] sm:p-11">
          <img src={logo} alt="LitePuff" className="mx-auto h-20 w-auto" />
          <div className="mb-8 mt-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[.24em] text-[#A0782F]">LitePuff Account</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-[#243029] sm:text-4xl">{loading ? 'Signing you in…' : 'Welcome Back'}</h1>
            <p className="mt-3 text-sm leading-6 text-[#68706B]">{loading ? 'Securely loading your account.' : 'Sign in to track your orders, save addresses and enjoy faster checkout.'}</p>
          </div>
          {loading
            ? <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#D8E2DB] border-t-[#1E4D3A]" role="status" aria-label="Restoring session" />
            : <PasswordlessAuth onComplete={() => navigate(destination, { replace: true })} />}
        </motion.div>
      </section>
    </>
  );
}
