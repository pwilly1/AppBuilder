module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Safelist classes used via @apply so JIT generates them even if they don't appear in scanned content
  safelist: [
    'bg-primary',
    'bg-primary-50',
    'bg-primary-100',
    'bg-primary-200',
    'hover:bg-primary-600',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0EA5A4', // teal-ish
          50: '#F0FEFE',
          100: '#DDFDFD',
          200: '#BFF9F8',
          600: '#0b8c89'
        },
        accent: '#7C3AED',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
      },
    },
  },
  plugins: [],
}
