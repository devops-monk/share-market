/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bullish: { DEFAULT: '#10b981', light: '#34d399', dark: '#059669' },
        bearish: { DEFAULT: '#ef4444', light: '#f87171', dark: '#dc2626' },
        neutral: { DEFAULT: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
        accent: { DEFAULT: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
        surface: {
          DEFAULT: 'var(--surface)',
          secondary: 'var(--surface-secondary)',
          tertiary: 'var(--surface-tertiary)',
          hover: 'var(--surface-hover)',
          border: 'var(--surface-border)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(99, 102, 241, 0.15)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.15)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.15)',
        card: 'var(--shadow-card)',
      },
    },
  },
  plugins: [],
};
