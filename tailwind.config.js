/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        arcade: {
          bg: '#0f0a1e',
          panel: '#1c1330',
          accent: '#ff4d8d',
          accent2: '#7c5cff',
        },
      },
    },
  },
  plugins: [],
};
