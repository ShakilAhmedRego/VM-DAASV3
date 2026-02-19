/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a5bafd',
          400: '#8194fb',
          500: '#6470f3',
          600: '#5050e8',
          700: '#4240cc',
          800: '#3637a5',
          900: '#313484',
          950: '#1d1e4e',
        },
        surface: {
          DEFAULT: '#0f1117',
          1: '#161821',
          2: '#1e2030',
          3: '#252840',
        },
      },
      backgroundImage: {
        'mesh-dark': 'radial-gradient(at 20% 25%, #1d1e4e 0px, transparent 50%), radial-gradient(at 80% 0%, #1e2030 0px, transparent 40%), radial-gradient(at 60% 80%, #252840 0px, transparent 50%)',
        'mesh-light': 'radial-gradient(at 20% 25%, #e0e9ff 0px, transparent 50%), radial-gradient(at 80% 0%, #f0f4ff 0px, transparent 40%), radial-gradient(at 60% 80%, #c7d7fe 0px, transparent 50%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 1.5s infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};
