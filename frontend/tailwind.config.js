/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef3f8',
          100: '#dce6f0',
          200: '#bdcee0',
          300: '#91afca',
          400: '#6089ad',
          500: '#416d93',
          600: '#315578',
          700: '#284462',
          800: '#223951',
          900: '#0B1F3A',
          950: '#071426',
        },
        orange: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#F97316',
          600: '#ea580c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 12px 40px rgba(11, 31, 58, 0.08)',
        card: '0 4px 20px rgba(11, 31, 58, 0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
