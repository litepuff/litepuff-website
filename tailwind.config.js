/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'rgb(var(--color-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
          accent: 'rgb(var(--color-accent) / <alpha-value>)',
          text: 'rgb(var(--color-text) / <alpha-value>)',
          muted: 'rgb(var(--color-muted) / <alpha-value>)',
          background: 'rgb(var(--color-background) / <alpha-value>)',
          border: 'rgb(var(--color-border) / <alpha-value>)',
          success: 'rgb(var(--color-success) / <alpha-value>)'
        }
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Cormorant Garamond', 'Georgia', 'serif']
      },
      boxShadow: {
        soft: '0 12px 40px rgba(0, 0, 0, 0.05)'
      }
    }
  },
  plugins: []
};
