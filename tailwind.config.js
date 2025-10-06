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
        },
      },
    },
  },
  plugins: [],
}