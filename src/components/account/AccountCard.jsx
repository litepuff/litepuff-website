import { useEffect, useState } from "react";
import { FiEdit3, FiLogOut, FiX } from "react-icons/fi";
import FormField from "./FormField";
import { apiMessage, customerService } from "../../services/customerService.js";
import { useToast } from "../../context/ToastContext.jsx";

const countryCodes = [
  ["India", "+91"],
  ["United States", "+1"],
  ["United Kingdom", "+44"],
  ["United Arab Emirates", "+971"],
  ["Singapore", "+65"],
  ["Australia", "+61"],
  ["Canada", "+1"],
];

export default function AccountCard({
  customer,
  editing,
  onEditing,
  onSave,
  onLogoutAll,
  onIdentityChanged,
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState(customer);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [identity, setIdentity] = useState(null);

  useEffect(() => setForm(customer), [customer]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await onSave({ firstName: form.firstName, lastName: form.lastName });
      setMessage("Profile updated.");
      showToast("Profile updated.");
      onEditing(false);
    } catch (error) {
      showToast(apiMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  const openIdentity = (type) =>
    setIdentity({ type, value: "", countryCode: "+91", otp: "", otpId: "", destination: "", busy: false });

  async function submitIdentity(event) {
    event.preventDefault();
    if (identity.busy) return;
    const value = identity.type === "phone"
      ? identity.value.startsWith("+") ? identity.value : `${identity.countryCode}${identity.value.replace(/\D/g, "")}`
      : identity.value.trim().toLowerCase();
    setIdentity((current) => ({ ...current, busy: true }));
    try {
      if (!identity.otpId) {
        const result = identity.type === "phone"
          ? await customerService.changePhoneStart(value)
          : await customerService.changeEmailStart(value);
        setIdentity((current) => ({ ...current, value, otpId: result.otpId, destination: result.destination, busy: false }));
        showToast(`OTP sent to ${result.destination}.`);
        return;
      }
      const result = identity.type === "phone"
        ? await customerService.verifyPhoneChange(identity.otpId, identity.value, identity.otp)
        : await customerService.verifyEmailChange(identity.otpId, identity.value, identity.otp);
      await onIdentityChanged(result.profile);
      showToast(`${identity.type === "phone" ? "Phone number" : "Email"} verified and updated.`);
      setIdentity(null);
    } catch (error) {
      setIdentity((current) => ({ ...current, busy: false }));
      showToast(apiMessage(error), "error");
    }
  }

  const details = [
    ["First Name", customer.firstName],
    ["Last Name", customer.lastName],
    ["Email", customer.email],
    ["Phone", customer.phone],
    [
      "Member Since",
      new Date(customer.createdAt || customer.joinedAt).toLocaleDateString(
        "en-IN",
        { day: "numeric", month: "long", year: "numeric" },
      ),
    ],
  ];

  return (
    <section
      id="account"
      className="w-full min-w-0 max-w-full overflow-hidden rounded-[28px] border border-[#E9E4DA] bg-white p-5 shadow-soft sm:p-7"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[.2em] text-[#9A7430]">
            PERSONAL DETAILS
          </p>
          <h2 className="mt-1 break-words text-2xl font-semibold sm:text-3xl">
            Account Information
          </h2>
        </div>
        {editing && (
          <button
            type="button"
            onClick={() => onEditing(false)}
            className="shrink-0 p-2"
            aria-label="Close profile editor"
          >
            <FiX />
          </button>
        )}
      </div>
      {message && (
        <p className="mb-4 rounded-xl bg-[#EAF3ED] p-3 text-sm text-[#1E4D3A]">
          {message}
        </p>
      )}
      {editing ? (
        <form onSubmit={submit} className="grid min-w-0 gap-4 sm:grid-cols-2">
          <FormField
            label="First name"
            value={form.firstName || ""}
            onChange={(event) =>
              setForm({ ...form, firstName: event.target.value })
            }
          />
          <FormField
            label="Last name"
            value={form.lastName || ""}
            onChange={(event) =>
              setForm({ ...form, lastName: event.target.value })
            }
          />
          <FormField
            label="Phone"
            value={form.phone || ""}
            disabled
            hint="Use Change Phone to verify a new number."
          />
          <FormField label="Email" value={form.email || ""} disabled />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="button" onClick={() => openIdentity("phone")} className="h-11 rounded-full border border-[#1E4D3A] px-5 text-sm font-semibold text-[#1E4D3A]">Change Phone</button>
            <button type="button" onClick={() => openIdentity("email")} className="h-11 rounded-full border border-[#1E4D3A] px-5 text-sm font-semibold text-[#1E4D3A]">Change Email</button>
          </div>
          <div className="sm:col-span-2">
            <button disabled={saving} className="h-11 w-full rounded-full bg-[#1E4D3A] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl className="grid min-w-0 gap-x-8 gap-y-5 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 border-b border-[#EEE9DF] pb-3"
              >
                <dt className="text-[10px] font-bold uppercase tracking-[.15em] text-[#8A8F8B]">
                  {label}
                </dt>
                <dd className="mt-1 break-words text-sm font-semibold text-[#243029]">
                  {value || "—"}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => onEditing(true)}
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#1E4D3A] px-5 text-sm font-semibold text-white"
            >
              <FiEdit3 /> Edit Profile
            </button>
            <button
              type="button"
              onClick={onLogoutAll}
              className="flex h-11 items-center justify-center gap-2 rounded-full border border-[#9A392F] px-5 text-sm font-semibold text-[#9A392F]"
            >
              <FiLogOut /> Logout All Devices
            </button>
          </div>
        </>
      )}
      {identity && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#14251D]/40 sm:items-center sm:p-5">
          <form onSubmit={submitIdentity} className="w-full max-w-md rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xl font-semibold">{identity.otpId ? "Enter verification code" : `Change ${identity.type}`}</h3>
              <button type="button" disabled={identity.busy} onClick={() => setIdentity(null)} className="grid h-11 w-11 place-items-center rounded-full" aria-label="Close verification"><FiX /></button>
            </div>
            {identity.otpId ? (
              <>
                <p className="mt-2 text-sm text-[#68706B]">Enter the 6-digit code sent to {identity.destination}.</p>
                <FormField name="otp" label="Verification code" value={identity.otp} inputMode="numeric" maxLength={6} autoComplete="one-time-code" onChange={(event) => setIdentity({ ...identity, otp: event.target.value.replace(/\D/g, "") })} />
              </>
            ) : identity.type === "phone" ? (
              <div className="mt-5 grid grid-cols-[120px_minmax(0,1fr)] gap-2">
                <label className="grid gap-2 text-sm font-semibold">Country<select value={identity.countryCode} onChange={(event) => setIdentity({ ...identity, countryCode: event.target.value })} className="h-14 rounded-2xl border border-[#DED9CF] bg-white px-3">{countryCodes.map(([name, code]) => <option key={`${name}-${code}`} value={code}>{code} {name}</option>)}</select></label>
                <FormField name="phone" label="Phone number" value={identity.value} inputMode="tel" autoComplete="tel-national" onChange={(event) => setIdentity({ ...identity, value: event.target.value })} />
              </div>
            ) : (
              <div className="mt-5"><FormField name="email" label="New email" type="email" value={identity.value} autoComplete="email" onChange={(event) => setIdentity({ ...identity, value: event.target.value })} /></div>
            )}
            <button disabled={identity.busy || (identity.otpId ? identity.otp.length !== 6 : !identity.value.trim())} className="mt-6 h-12 w-full rounded-full bg-[#1E4D3A] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {identity.busy ? "Please wait…" : identity.otpId ? "Verify OTP" : "Send OTP"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
