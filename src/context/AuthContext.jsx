import { createContext, useContext, useMemo, useState } from 'react';
import { loginAdmin } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    return JSON.parse(localStorage.getItem('adminUser') || 'null');
  });

  async function login(email, password) {
    const data = await loginAdmin(email, password);
    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminUser', JSON.stringify(data.admin));
    setAdmin(data.admin);
    return data.admin;
  }

  function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setAdmin(null);
  }

  const value = useMemo(() => ({ admin, login, logout }), [admin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
