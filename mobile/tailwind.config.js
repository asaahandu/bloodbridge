/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F5F3',
        card: '#FFFFFF',
        field: '#FAFAF9',
        ink: '#121212',
        line: '#E7E6E2',
        muted: '#737373',
        'blood-red': '#8E1722',
        'blood-red-dark': '#681019',
        'blood-red-soft': '#F6E9EA',
        error: '#B42318',
        'error-soft': '#FEF3F2',
        success: '#1F6A4C',
        'success-soft': '#EAF5EF',
      },
      fontFamily: {
        'space-mono': ['SpaceMono'],
      },
    },
  },
  plugins: [],
};
