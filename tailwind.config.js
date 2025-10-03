/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pieng: {
          primary: '#3366CC',
          secondary: '#FF6B35',
          success: '#2ecc71',
          danger: '#e74c3c',
          warning: '#f39c12',
          light: '#f8f9fa',
          dark: '#343a40',
          muted: '#6c757d'
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif']
      },
      animation: {
        'pulse-custom': 'pulse-custom 2s infinite',
        'glow': 'glow 2s infinite alternate'
      },
      keyframes: {
        'pulse-custom': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' }
        },
        'glow': {
          'from': { boxShadow: '0 0 5px #f39c12' },
          'to': { boxShadow: '0 0 20px #f39c12' }
        }
      }
    },
  },
  plugins: [],
}