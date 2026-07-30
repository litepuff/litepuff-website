import { useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiCheck, FiLoader, FiMail, FiMessageCircle } from "react-icons/fi";
import { customerService, apiMessage } from "../../services/customerService";
import { useCustomerAuth } from "../../context/CustomerAuthContext";
import useMetaTracking from "../../analytics/useMetaTracking.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LIMIT_CODES = new Set(["OTP_GENERATION_LIMIT", "OTP_REQUEST_RATE_LIMIT"]);
const countries = [
  ["India", "+91"],
  ["United States", "+1"],
  ["United Kingdom", "+44"],
  ["United Arab Emirates", "+971"],
  ["Singapore", "+65"],
  ["Australia", "+61"],
  ["Canada", "+1"],
];
const digitsOnly = (value) => String(value || "").replace(/\D/g, "");
const formatCountdown = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

function friendlyError(error) {
  const code = error?.response?.data?.code;
  if (code === "WHATSAPP_TEMPLATE_MISSING" || code === "WHATSAPP_TEMPLATE_REJECTED" || code === "WHATSAPP_AUTH_TEMPLATE_INVALID" || code === "WHATSAPP_DELIVERY_FAILED") {
    return "Unable to send the verification code. Please try again in a few moments.";
  }
  if (code === "EMAIL_DELIVERY_FAILED") {
    return "Unable to send the verification email. Please try again in a few moments.";
  }
  return apiMessage(error);
}

export default function PasswordlessAuth({ onComplete }) {
  const { completeAuthentication } = useCustomerAuth();
  const { trackCompleteRegistration } = useMetaTracking();
  const [step, setStep] = useState("method");
  const [mode, setMode] = useState("login");
  const [provider, setProvider] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [name, setName] = useState("");
  const [challenge, setChallenge] = useState(null);
  const [otpDigits, setOtpDigits] = useState(Array(6).fill(""));
  const [error, setError] = useState("");
  const [alternateProvider, setAlternateProvider] = useState("");
  const [busy, setBusy] = useState(false);
  const [rateLimitUntil, setRateLimitUntil] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (!rateLimitUntil) {
      setRemainingSeconds(0);
      return undefined;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((rateLimitUntil - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (!remaining) setRateLimitUntil(0);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [rateLimitUntil]);

  const resetEntry = (nextProvider = provider, nextMode = mode) => {
    setProvider(nextProvider);
    setMode(nextMode);
    setIdentifier("");
    setChallenge(null);
    setOtpDigits(Array(6).fill(""));
    setError("");
    setAlternateProvider("");
    setStep("identifier");
  };

  const normalizedIdentifier = () => {
    if (provider === "email") return identifier.trim().toLowerCase();
    return identifier.trim().startsWith("+")
      ? `+${digitsOnly(identifier)}`
      : `${countryCode}${digitsOnly(identifier)}`;
  };

  const validIdentifier = (value) =>
    provider === "email" ? EMAIL_PATTERN.test(value) : /^\+[1-9]\d{7,14}$/.test(value);

  const requestCode = async (event) => {
    event.preventDefault();
    if (busy || remainingSeconds) return;
    setError("");
    setAlternateProvider("");
    const normalized = normalizedIdentifier();
    if (!validIdentifier(normalized)) {
      setError(provider === "email" ? "Enter a valid email address." : "Enter a valid WhatsApp number.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Enter your name to create your account.");
      return;
    }
    setBusy(true);
    try {
      const result = await customerService.requestOtp({ provider, purpose: mode, identifier: normalized });
      setChallenge({ ...result, identifier: normalized });
      setStep("otp");
      window.setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (requestError) {
      const code = requestError.response?.data?.code;
      if (OTP_LIMIT_CODES.has(code)) {
        const retryAfter = Math.max(1, Number(requestError.response?.data?.details?.retryAfterSeconds) || 600);
        setRateLimitUntil(Date.now() + retryAfter * 1000);
      } else if (mode === "login" && code === "CUSTOMER_NOT_FOUND") {
        setStep("not-found");
      } else {
        setError(friendlyError(requestError));
        setAlternateProvider(requestError.response?.data?.details?.alternateProvider || "");
      }
    } finally {
      setBusy(false);
    }
  };

  const verify = async (code = otpDigits.join("")) => {
    if (code.length !== 6 || busy || !challenge) return;
    setBusy(true);
    setError("");
    try {
      const parts = name.trim().split(/\s+/);
      const result = await customerService.verifyOtp(challenge, code, mode === "signup"
        ? { firstName: parts.shift() || "", lastName: parts.join(" ") }
        : {});
      await completeAuthentication(result);
      if (mode === "signup") {
        try { trackCompleteRegistration({ method: provider }); } catch { /* Analytics is optional. */ }
      }
      setStep("complete");
      onComplete?.();
    } catch (verificationError) {
      setError(friendlyError(verificationError));
      setOtpDigits(Array(6).fill(""));
      otpRefs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const updateOtp = (index, value) => {
    const clean = digitsOnly(value).slice(-1);
    const next = [...otpDigits];
    next[index] = clean;
    setOtpDigits(next);
    if (clean && index < 5) otpRefs.current[index + 1]?.focus();
    if (next.every(Boolean)) verify(next.join(""));
  };

  if (step === "complete") {
    return (
      <div className="py-5 text-center" role="status">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#E7EFE9] text-[#1E4D3A]"><FiCheck size={28} /></span>
        <h2 className="mt-5 font-display text-3xl font-semibold">Welcome back!</h2>
        <p className="mt-2 text-sm text-[#68706B]">Redirecting you to your account...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      {step === "method" && (
        <div>
          <section aria-labelledby="existing-customer-title">
            <h2 id="existing-customer-title" className="text-sm font-bold uppercase tracking-[.16em] text-[#68706B]">Existing Customer</h2>
            <div className="mt-3 grid gap-3">
              <MethodButton icon={FiMail} onClick={() => resetEntry("email", "login")}>Continue with Email</MethodButton>
              <MethodButton icon={FiMessageCircle} onClick={() => resetEntry("whatsapp", "login")}>Continue with WhatsApp</MethodButton>
            </div>
          </section>
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[.18em] text-[#9A9F9B]"><span className="h-px flex-1 bg-[#E7E2D8]" />or<span className="h-px flex-1 bg-[#E7E2D8]" /></div>
          <section aria-labelledby="new-customer-title">
            <h2 id="new-customer-title" className="text-sm font-bold uppercase tracking-[.16em] text-[#68706B]">New Customer</h2>
            <button type="button" onClick={() => { setMode("signup"); setStep("signup-method"); }} className="mt-3 h-13 w-full rounded-full border border-[#1E4D3A] px-5 py-3.5 font-bold text-[#1E4D3A] transition hover:bg-[#EFF5F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D3A] focus-visible:ring-offset-4">Create Account</button>
          </section>
        </div>
      )}

      {step === "signup-method" && (
        <div>
          <BackButton onClick={() => setStep("method")}>Back to login</BackButton>
          <h2 className="font-display text-2xl font-semibold text-[#243029]">Create your LitePuff account</h2>
          <p className="mt-2 text-sm leading-6 text-[#68706B]">Choose where you would like to receive your verification code.</p>
          <div className="mt-5 grid gap-3">
            <MethodButton icon={FiMail} onClick={() => resetEntry("email", "signup")}>Create with Email</MethodButton>
            <MethodButton icon={FiMessageCircle} onClick={() => resetEntry("whatsapp", "signup")}>Create with WhatsApp</MethodButton>
          </div>
        </div>
      )}

      {step === "identifier" && (
        <form onSubmit={requestCode} noValidate>
          <BackButton onClick={() => setStep(mode === "signup" ? "signup-method" : "method")}>Back</BackButton>
          <h2 className="font-display text-2xl font-semibold text-[#243029]">{mode === "signup" ? "Create Account" : provider === "email" ? "Continue with Email" : "Continue with WhatsApp"}</h2>
          <p className="mt-2 text-sm leading-6 text-[#68706B]">{mode === "signup" ? "We’ll verify your details before creating your account." : `Enter the ${provider === "email" ? "email address" : "WhatsApp number"} connected to your account.`}</p>
          {mode === "signup" && (
            <Field label="Full name" id="auth-name" value={name} onChange={setName} autoComplete="name" placeholder="Your full name" />
          )}
          <label htmlFor="auth-identifier" className={`${mode === "signup" ? "mt-4" : "mt-6"} block text-sm font-semibold text-[#243029]`}>{provider === "email" ? "Email address" : "WhatsApp number"}</label>
          <div className="mt-2 flex min-w-0 overflow-hidden rounded-2xl border border-[#DED8CC] bg-white focus-within:border-[#1E4D3A] focus-within:ring-4 focus-within:ring-[#1E4D3A]/10">
            {provider === "whatsapp" && (
              <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} aria-label="Phone country code" className="h-14 w-[78px] shrink-0 border-0 border-r border-[#E8E3D9] bg-[#FAF8F2] px-2 text-sm font-semibold outline-none">
                {countries.map(([country, code]) => <option key={`${country}-${code}`} value={code}>{code} — {country}</option>)}
              </select>
            )}
            <input id="auth-identifier" autoFocus value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete={provider === "email" ? "email" : "tel"} inputMode={provider === "email" ? "email" : "tel"} placeholder={provider === "email" ? "you@example.com" : "98765 43210"} aria-invalid={Boolean(error)} aria-describedby={error ? "auth-error" : undefined} className="h-14 min-w-0 flex-1 bg-transparent px-4 text-base outline-none" />
          </div>
          {error && <InlineError>{error}</InlineError>}
          {alternateProvider && (
            <button type="button" onClick={() => resetEntry(alternateProvider, "login")} className="mt-3 text-sm font-bold text-[#1E4D3A] underline decoration-[#C89B3C] underline-offset-4">
              Use {alternateProvider === "email" ? "Email" : "WhatsApp"} instead
            </button>
          )}
          {remainingSeconds > 0 && <RateLimitNotice seconds={remainingSeconds} />}
          <PrimaryButton busy={busy} disabled={Boolean(remainingSeconds)}>{mode === "signup" ? "Send verification code" : "Continue"}</PrimaryButton>
        </form>
      )}

      {step === "not-found" && (
        <div>
          <BackButton onClick={() => resetEntry(provider, "login")}>Try another {provider === "email" ? "email" : "number"}</BackButton>
          <h2 className="font-display text-2xl font-semibold text-[#243029]">Account not found</h2>
          <p className="mt-3 text-sm leading-6 text-[#68706B]">We couldn&apos;t find an account with this {provider === "email" ? "email" : "WhatsApp number"}.</p>
          <div className="mt-5 grid gap-3">
            <MethodButton icon={provider === "email" ? FiMessageCircle : FiMail} onClick={() => resetEntry(provider === "email" ? "whatsapp" : "email", "login")}>Use {provider === "email" ? "WhatsApp" : "Email"} Instead</MethodButton>
            <button type="button" onClick={() => { setMode("signup"); setStep("signup-method"); }} className="h-13 rounded-full bg-[#1E4D3A] px-5 py-3.5 font-bold text-white">Create New Account</button>
          </div>
        </div>
      )}

      {step === "otp" && (
        <div className="text-center">
          <BackButton onClick={() => resetEntry(provider, mode)}>Change details</BackButton>
          {provider === "email" ? <FiMail className="mx-auto text-[#C89B3C]" size={30} /> : <FiMessageCircle className="mx-auto text-[#C89B3C]" size={30} />}
          <h2 className="mt-3 font-display text-3xl font-semibold">Check your {provider === "email" ? "email" : "WhatsApp"}</h2>
          <p className="mt-2 text-sm leading-6 text-[#68706B]">Enter the 6-digit verification code we sent to {challenge?.destination}.</p>
          <p className="mt-3 text-sm font-medium text-[#287A50]" role="status">Verification code sent successfully.</p>
          <div className="mt-6 grid grid-cols-6 gap-1.5 sm:gap-2" onPaste={(event) => {
            const code = digitsOnly(event.clipboardData.getData("text")).slice(0, 6);
            if (code.length === 6) { event.preventDefault(); setOtpDigits(code.split("")); verify(code); }
          }}>
            {otpDigits.map((digit, index) => (
              <input key={index} ref={(node) => { otpRefs.current[index] = node; }} value={digit} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={1} aria-label={`Verification code digit ${index + 1}`} onChange={(event) => updateOtp(index, event.target.value)} onKeyDown={(event) => { if (event.key === "Backspace" && !otpDigits[index] && index) otpRefs.current[index - 1]?.focus(); }} className="h-12 min-w-0 rounded-xl border border-[#DED8CC] text-center text-lg font-bold outline-none focus:border-[#1E4D3A] focus:ring-2 focus:ring-[#1E4D3A]/10 sm:h-14" />
            ))}
          </div>
          {error && <InlineError>{error}</InlineError>}
          <PrimaryButton busy={busy} disabled={otpDigits.some((digit) => !digit)} onClick={() => verify()}>Verify & continue</PrimaryButton>
        </div>
      )}
      <p className="mt-6 text-center text-xs text-[#7B817D]">Your information is securely protected.</p>
    </div>
  );
}

function MethodButton({ icon: Icon, children, onClick }) {
  return <button type="button" onClick={onClick} className="flex h-14 w-full items-center justify-center gap-3 rounded-full border border-[#DED8CC] bg-white px-5 font-bold text-[#243029] transition hover:border-[#1E4D3A] hover:bg-[#F7FAF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D3A] focus-visible:ring-offset-4"><Icon aria-hidden="true" />{children}</button>;
}
function BackButton({ children, onClick }) {
  return <button type="button" onClick={onClick} className="mb-5 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#5B5F59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D3A]"><FiArrowLeft aria-hidden="true" />{children}</button>;
}
function PrimaryButton({ busy, disabled, children, onClick }) {
  return <button type={onClick ? "button" : "submit"} onClick={onClick} disabled={busy || disabled} className="mt-5 flex h-14 w-full items-center justify-center rounded-full bg-[#1E4D3A] font-bold text-white shadow-[0_10px_24px_rgba(30,77,58,.18)] transition hover:-translate-y-0.5 hover:bg-[#2C614A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D3A] focus-visible:ring-offset-4 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <FiLoader className="animate-spin" aria-label="Please wait" /> : children}</button>;
}
function InlineError({ children }) {
  return <p id="auth-error" role="alert" className="mt-2 text-sm text-[#A33D34]"><span aria-hidden="true">⚠ </span>{children}</p>;
}
function RateLimitNotice({ seconds }) {
  return <div role="status" aria-live="polite" className="mt-4 rounded-2xl border border-[#E9D8D3] bg-[#FFF9F7] p-4"><h3 className="font-display text-lg font-semibold text-[#613B35]">Too Many OTP Requests</h3><p className="mt-1 text-sm leading-6 text-[#79564F]">For your security, you&apos;ve requested the verification code several times. Please wait 10 minutes before requesting another OTP.</p><p className="mt-3 font-mono text-xl font-semibold tabular-nums text-[#1E4D3A]">{formatCountdown(seconds)}</p></div>;
}
function Field({ label, id, value, onChange, ...inputProps }) {
  return <div className="mt-5"><label htmlFor={id} className="block text-sm font-semibold text-[#243029]">{label}</label><input id={id} value={value} onChange={(event) => onChange(event.target.value)} {...inputProps} className="mt-2 h-14 w-full rounded-2xl border border-[#DED8CC] bg-white px-4 text-base outline-none focus:border-[#1E4D3A] focus:ring-4 focus:ring-[#1E4D3A]/10" /></div>;
}
