/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pieng: {
          primary: '#3366CC',
          secondary: '#1a4d8f',
          dark: '#0d2847',
          light: '#5c8ae6',
          accent: '#FFB800',
          warning: '#f39c12',
          success: '#2ecc71',
          danger: '#e74c3c',
        },
      },
      animation: {
        'glow': 'glow 2s infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #FFB800, 0 0 10px #FFB800' },
          '100%': { boxShadow: '0 0 10px #FFB800, 0 0 20px #FFB800' },
        },
      },
    },
  },
  plugins: [],
}