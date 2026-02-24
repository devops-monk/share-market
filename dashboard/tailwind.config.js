/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bullish: { DEFAULT: '#16a34a', light: '#22c55e', dark: '#15803d' },
        bearish: { DEFAULT: '#dc2626', light: '#ef4444', dark: '#b91c1c' },
        neutral: { DEFAULT: '#d97706', light: '#f59e0b', dark: '#b45309' },
        accent: { DEFAULT: '#3b82f6', light: '#60a5fa', dark: '#2563eb' },
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
        glow: '0 0 15px rgba(59, 130, 246, 0.1)',
        'glow-green': '0 0 15px rgba(22, 163, 74, 0.1)',
        'glow-red': '0 0 15px rgba(220, 38, 38, 0.1)',
        'glow-blue': '0 0 15px rgba(59, 130, 246, 0.12)',
        card: 'var(--shadow-card)',
      },
    },
  },
  plugins: [],
};
