/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        slate: {
          50: '#ffffff',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0', // close to sub green #c3f0c0
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#22ae18', // Main Color - Updated
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#00a68d', // Logo Green as darkest or accent
        }
      }
    },
  },
  plugins: [],
}
