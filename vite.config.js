import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const values = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  if (mode === 'production') {
    const local = ['VITE_API_BASE_URL', 'VITE_SITE_URL'].filter((key) => /localhost|127\.0\.0\.1/i.test(values[key] || ''));
    if (local.length) throw new Error(`Production build cannot use localhost values: ${local.join(', ')}`);
  }
  return {
    envPrefix: ['VITE_'],
    plugins: [react()],
    build: { rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom', 'react-helmet-async'], motion: ['framer-motion'], icons: ['react-icons'], http: ['axios'] } } } },
    server: { port: 5173 }
  };
});
