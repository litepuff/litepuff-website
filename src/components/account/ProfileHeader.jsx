import { FiEdit3 } from 'react-icons/fi';

export default function ProfileHeader({ customer, onEdit }) {
  const initials = `${customer.firstName?.[0] || ''}${customer.lastName?.[0] || ''}`;
  const joined = customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'recently';
  return (
    <>
      <div className="mb-6 sm:mb-8">
        <p className="text-[11px] font-bold tracking-[.16em] text-[#9A7430] sm:text-xs sm:tracking-[.2em]">YOUR LITEPUFF ACCOUNT</p>
        <h1 className="mt-2 break-words text-4xl font-semibold leading-none text-[#243029] sm:text-6xl">Hello, {customer.firstName} <span aria-hidden>👋</span></h1>
        <p className="mt-3 text-sm leading-6 text-[#68706B] sm:text-base">Welcome back. Manage your LitePuff account, orders and preferences.</p>
      </div>
      <div className="mb-6 flex min-w-0 flex-col gap-4 rounded-[24px] border border-[#E9E4DA] bg-white p-5 shadow-soft sm:mb-8 sm:flex-row sm:items-center sm:gap-5 sm:rounded-[28px] sm:p-7">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1E4D3A] font-display text-xl font-semibold text-white sm:h-16 sm:w-16 sm:text-2xl">{initials}</div>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-xl font-semibold text-[#243029] sm:text-2xl">{customer.firstName} {customer.lastName}</h2>
          <p className="break-all text-sm text-[#68706B] sm:truncate">{customer.email}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[.1em] text-[#9A7430] sm:text-xs sm:tracking-[.12em]">Member since {joined}</p>
        </div>
        <button type="button" onClick={onEdit} className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#1E4D3A] px-5 text-sm font-semibold text-[#1E4D3A] transition hover:bg-[#1E4D3A] hover:text-white sm:w-auto"><FiEdit3 /> Edit Profile</button>
      </div>
    </>
  );
}
