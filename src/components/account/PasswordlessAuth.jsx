import { useEffect, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiCheck,
  FiLoader,
  FiMessageCircle,
} from "react-icons/fi";
import { customerService, apiMessage } from "../../services/customerService";
import { useCustomerAuth } from "../../context/CustomerAuthContext";

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const countryCodes = [
  ["India", "+91"],
  ["United States", "+1"],
  ["United Kingdom", "+44"],
  ["United Arab Emirates", "+971"],
  ["Singapore", "+65"],
  ["Australia", "+61"],
  ["Canada", "+1"],
];
const phoneDigits = (value) => value.replace(/\D/g, "");
const isPhone = (value) => /^\+[1-9]\d{7,14}$/.test(value);
const OTP_LIMIT_CODES = new Set(["OTP_GENERATION_LIMIT", "OTP_REQUEST_RATE_LIMIT"]);
const formatCountdown = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export default function PasswordlessAuth({ onComplete }) {
  const { completeAuthentication } = useCustomerAuth();
  const [step, setStep] = useState("identifier");
  const [identifier, setIdentifier] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [challenge, setChallenge] = useState(null);
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [rateLimitUntil, setRateLimitUntil] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const refs = useRef([]);
  const phoneMode = !identifier || /^[+\d\s().-]*$/.test(identifier);

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

  const submitIdentifier = async (event) => {
    event.preventDefault();
    if (remainingSeconds > 0) return;
    setError("");
    setSuccess("");
    const emailIdentifier = isEmail(identifier);
    const normalizedIdentifier = emailIdentifier
      ? identifier.trim().toLowerCase()
      : identifier.trim().startsWith("+")
        ? `+${phoneDigits(identifier)}`
        : `${countryCode}${phoneDigits(identifier)}`;
    if (!emailIdentifier && !isPhone(normalizedIdentifier))
      return setError("Enter a valid mobile number or email address.");
    setBusy(true);
    try {
      const result = await customerService.beginOtp(normalizedIdentifier);
      setChallenge({ ...result, identifier: normalizedIdentifier });
      setSuccess("Verification code sent to your WhatsApp.");
      setStep("otp");
      setTimeout(() => refs.current[0]?.focus(), 100);
    } catch (err) {
      const code = err.response?.data?.code;
      if (OTP_LIMIT_CODES.has(code)) {
        const retryAfter = Math.max(1, Number(err.response?.data?.details?.retryAfterSeconds) || 600);
        setRateLimitUntil(Date.now() + retryAfter * 1000);
      } else {
        setError(apiMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const verify = async (code = digits.join("")) => {
    if (code.length !== 6 || busy || !challenge) return;
    setBusy(true);
    setError("");
    try {
      const result = await customerService.verifyOtp(challenge, code);
      await completeAuthentication(result);
      setStep("complete");
      onComplete?.();
    } catch (err) {
      setError(apiMessage(err));
      setDigits(Array(6).fill(""));
      refs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const updateDigit = (index, value) => {
    const clean = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < 5) refs.current[index + 1]?.focus();
    if (next.every(Boolean)) verify(next.join(""));
  };
  const paste = (event) => {
    const code = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (code.length === 6) {
      event.preventDefault();
      setDigits(code.split(""));
      verify(code);
    }
  };

  return (
    <div className="w-full">
      {step !== "identifier" && step !== "complete" && (
        <button
          type="button"
          onClick={() => {
            setStep("identifier");
            setChallenge(null);
            setDigits(Array(6).fill(""));
            setError("");
            setSuccess("");
          }}
          className="mb-5 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#5B5F59] outline-none transition hover:text-[#1E4D3A] focus-visible:ring-2 focus-visible:ring-[#1E4D3A] focus-visible:ring-offset-4"
        >
          <FiArrowLeft /> Change details
        </button>
      )}
      {step === "identifier" && (
        <form onSubmit={submitIdentifier}>
          <label
            className="block text-sm font-semibold text-[#243029]"
            htmlFor="login-identifier"
          >
            Email address or WhatsApp number
          </label>
          <div className="mt-2 flex min-w-0 overflow-hidden rounded-2xl border border-[#DED8CC] bg-white shadow-sm transition focus-within:border-[#1E4D3A] focus-within:ring-4 focus-within:ring-[#1E4D3A]/10">
            {phoneMode && (
              <select
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                aria-label="Phone country code"
                className="h-14 w-[76px] shrink-0 cursor-pointer border-0 border-r border-[#E8E3D9] bg-[#FAF8F2] px-2 text-sm font-semibold text-[#243029] outline-none sm:w-[82px]"
              >
                {countryCodes.map(([country, code]) => (
                  <option key={`${country}-${code}`} value={code}>{code} — {country}</option>
                ))}
              </select>
            )}
            <input
              id="login-identifier"
              autoFocus
              autoComplete="username"
              inputMode={phoneMode ? "tel" : "email"}
              value={identifier}
              onChange={(event) => {
                const value = event.target.value;
                setIdentifier(value);
                if (value.trim().startsWith("+")) {
                  const match = [...countryCodes]
                    .sort((a, b) => b[1].length - a[1].length)
                    .find(([, code]) => value.trim().startsWith(code));
                  if (match) setCountryCode(match[1]);
                }
              }}
              placeholder="Enter your email or WhatsApp number"
              aria-describedby={[
                error ? "login-identifier-error" : "",
                remainingSeconds ? "otp-rate-limit-message" : "",
              ].filter(Boolean).join(" ") || undefined}
              aria-invalid={Boolean(error)}
              className="h-14 min-w-0 flex-1 border-0 bg-transparent px-4 text-base text-[#243029] outline-none placeholder:text-[#969B97]"
            />
          </div>
          {error && (
            <p id="login-identifier-error" role="alert" className="mt-2 text-sm text-[#A33D34]">
              <span aria-hidden="true">⚠ </span>{error}
            </p>
          )}
          {remainingSeconds > 0 && (
            <div
              id="otp-rate-limit-message"
              role="status"
              aria-live="polite"
              className="mt-4 rounded-2xl border border-[#E9D8D3] bg-[#FFF9F7] p-4 text-left"
            >
              <h2 className="font-display text-lg font-semibold text-[#613B35]">Too Many OTP Requests</h2>
              <p className="mt-1 text-sm leading-6 text-[#79564F]">
                For your security, you&apos;ve requested the verification code several times.
                Please wait 10 minutes before requesting another OTP. We appreciate your patience.
              </p>
              <p className="mt-3 font-mono text-xl font-semibold tabular-nums text-[#1E4D3A]" aria-label={`${remainingSeconds} seconds remaining`}>
                {formatCountdown(remainingSeconds)}
              </p>
            </div>
          )}
          <button
            disabled={busy || remainingSeconds > 0}
            aria-disabled={busy || remainingSeconds > 0}
            className="mt-5 flex h-14 w-full items-center justify-center rounded-full bg-[#1E4D3A] font-bold text-white shadow-[0_10px_24px_rgba(30,77,58,.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#2C614A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D3A] focus-visible:ring-offset-4 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {busy ? (
              <FiLoader className="animate-spin" aria-label="Signing in" />
            ) : (
              "Continue"
            )}
          </button>
        </form>
      )}
      {step === "otp" && (
        <div className="min-w-0 text-center">
          <FiMessageCircle className="mx-auto text-[#C89B3C]" size={30} />
          <h2 className="mt-3 font-display text-3xl font-semibold">
            Verify your WhatsApp number
          </h2>
          <p className="mt-2 break-words text-sm leading-6 text-[#68706B]">
            We&apos;ve sent a 6-digit verification code to your registered
            WhatsApp number. Enter it below to continue securely.
          </p>
          {success && (
            <p role="status" aria-live="polite" className="mt-4 text-sm font-medium text-[#287A50]">
              <span aria-hidden="true">✓ </span>{success}
            </p>
          )}
          <div
            className="mt-6 grid w-full grid-cols-6 gap-1.5 sm:gap-2"
            onPaste={paste}
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  refs.current[index] = node;
                }}
                value={digit}
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                aria-label={`Verification code digit ${index + 1}`}
                onChange={(e) => updateDigit(index, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digits[index] && index)
                    refs.current[index - 1]?.focus();
                }}
                className="h-12 min-w-0 w-full rounded-xl border border-[#DED8CC] text-center text-lg font-bold outline-none focus:border-[#1E4D3A] focus:ring-2 focus:ring-[#1E4D3A]/10 sm:h-14 sm:text-xl"
              />
            ))}
          </div>
          <button
            onClick={() => verify()}
            disabled={busy || digits.some((digit) => !digit)}
            className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-[#1E4D3A] font-bold text-white transition hover:bg-[#2C614A] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <FiLoader
                className="animate-spin"
                aria-label="Verifying account"
              />
            ) : (
              "Verify & continue"
            )}
          </button>
        </div>
      )}
      {step === "complete" && (
        <div className="py-5 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#E7EFE9] text-[#1E4D3A]">
            <FiCheck size={28} />
          </span>
          <h2 className="mt-5 font-display text-3xl font-semibold">
            Welcome back!
          </h2>
          <p className="mt-2 text-sm text-[#68706B]">
            Redirecting you to your account...
          </p>
        </div>
      )}
      {error && step !== "identifier" && (
        <p
          role="alert"
          className="mt-4 text-center text-sm text-[#A33D34]"
        >
          <span aria-hidden="true">⚠ </span>{error}
        </p>
      )}
      <p className="mt-6 text-center text-xs text-[#7B817D]">
        Your information is securely protected.
      </p>
    </div>
  );
}
