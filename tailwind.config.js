/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        'xs': '360px',   // Extra small mobile devices
        'sm': '640px',   // Small mobile
        'md': '768px',   // Tablets
        'lg': '1024px',  // Desktop (main breakpoint)
        'xl': '1280px',  // Large desktop
        '2xl': '1536px', // Extra large desktop
      },
    },
  },
  plugins: [],
};
