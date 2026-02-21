/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bullish: '#22c55e',
        bearish: '#ef4444',
        neutral: '#f59e0b',
        surface: {
          DEFAULT: '#111827',
          secondary: '#1f2937',
          tertiary: '#374151',
        },
      },
    },
  },
  plugins: [],
};
