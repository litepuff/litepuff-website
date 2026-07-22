import { Suspense, useEffect } from 'react';
import { useRoutes } from 'react-router-dom';
import { appRoutes } from './routes/appRoutes.jsx';
import { applyThemeFromLogo } from './utils/themeColors';
import logo from './assets/images/logo.png';

export default function App() {
  useEffect(() => {
    applyThemeFromLogo(logo);
  }, []);

  const routes = useRoutes(appRoutes);
  return <Suspense fallback={<main className="grid min-h-[60vh] place-items-center bg-[#FAF8F2] text-[#1E4D3A]" aria-live="polite">Loading LitePuff…</main>}>{routes}</Suspense>;
}
