import { Link } from 'react-router-dom';

const styles = {
  primary: 'bg-[#1E4D3A] text-white hover:bg-[#C89B3C] hover:text-[#243029]',
  secondary: 'border border-[#1E4D3A] bg-transparent text-[#1E4D3A] hover:bg-[#1E4D3A] hover:text-white',
  accent: 'bg-[#1E4D3A] text-white hover:bg-[#C89B3C] hover:text-[#243029]',
};

export default function Button({ children, to, type = 'button', variant = 'primary', className = '', onClick, disabled = false, loading = false, ...props }) {
  const classes = `inline-flex min-h-11 items-center justify-center rounded-full px-6 py-3 text-base font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C] disabled:cursor-not-allowed disabled:opacity-55 sm:px-8 ${styles[variant]} ${className}`;

  if (to) {
    return <Link to={to} onClick={onClick} className={classes} aria-disabled={disabled || loading} {...props}>{loading ? 'Please wait…' : children}</Link>;
  }

  return <button type={type} onClick={onClick} disabled={disabled || loading} aria-busy={loading} className={classes} {...props}>{loading ? 'Please wait…' : children}</button>;
}


