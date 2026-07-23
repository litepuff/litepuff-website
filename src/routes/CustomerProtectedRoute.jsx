import { Navigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';

export default function CustomerProtectedRoute({ children }) {
  const { customer, loading } = useCustomerAuth();
  const location = useLocation();
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center bg-[#FAF8F2]"><span className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E4D3A] border-t-transparent" aria-label="Restoring secure session"/></div>;
  const destination = `${location.pathname}${location.search}${location.hash}`;
  return customer ? children : <Navigate to="/login" replace state={{ from: destination }} />;
}
