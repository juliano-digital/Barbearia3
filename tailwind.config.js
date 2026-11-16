/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: '#0f1115',
        gold: '#C9A96B',
        champagne: '#f6e5b3',
        ink: '#0B0B0C',
      },
      boxShadow: {
        soft: '0 20px 50px rgba(0, 0, 0, 0.18)',
      },
    },
  },
  plugins: [],
};
