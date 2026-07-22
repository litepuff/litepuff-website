import { Link } from 'react-router-dom';

const styles = {
  primary: 'bg-[#1E4D3A] text-white hover:bg-[#C89B3C] hover:text-[#243029]',
  secondary: 'border border-[#1E4D3A] bg-transparent text-[#1E4D3A] hover:bg-[#1E4D3A] hover:text-white',
  accent: 'bg-[#1E4D3A] text-white hover:bg-[#C89B3C] hover:text-[#243029]',
};

export default function Button({ children, to, type = 'button', variant = 'primary', className = '', onClick }) {
  const classes = `inline-flex h-[52px] items-center justify-center rounded-full px-8 text-base font-semibold transition-all duration-300 hover:-translate-y-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C] ${styles[variant]} ${className}`;

  if (to) {
    return <Link to={to} onClick={onClick} className={classes}>{children}</Link>;
  }

  return <button type={type} onClick={onClick} className={classes}>{children}</button>;
}


