/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Primary green — matches the E-mmortal mark + Donezo reference
        brand: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
          400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
          800: '#065f46', 900: '#064e3b',
        },
        // Warm accent for highlights / CTAs
        accent: {
          50: '#fff7ed', 100: '#ffedd5', 400: '#fb923c', 500: '#f97316',
          600: '#ea580c', 700: '#c2410c',
        },
        // Sidebar / deep surfaces
        ink: {
          700: '#1e293b', 800: '#162033', 900: '#0d1626', 950: '#080f1c',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.06)',
        card: '0 1px 3px rgba(16,24,40,.06), 0 10px 30px rgba(16,24,40,.05)',
        pop: '0 12px 40px rgba(16,24,40,.16)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out',
      },
    },
  },
  plugins: [],
};
