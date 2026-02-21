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
          DEFAULT: '#0f1117',
          secondary: '#161b22',
          tertiary: '#1c2333',
          hover: '#242d3d',
          border: '#2d3748',
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
        card: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};
