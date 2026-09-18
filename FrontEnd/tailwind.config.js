/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#003DA5',
          dark: '#002D7A',
          light: '#1E5BC6',
        },
        'secondary-light': '#F5F5F5',
        gray: {
          200: '#E0E0E0',
          700: '#424242',
          900: '#212121',
        },
        success: '#4CAF50',
        warning: '#FF9800',
        danger: '#F44336',
      },
      spacing: {
        'sidebar': '240px',
        'header': '64px',
        'footer': '60px',
      },
      height: {
        'header': '64px',
        'footer': '60px',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
