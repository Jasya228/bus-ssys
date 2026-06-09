/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'transit-dark': '#0F172A',
        'transit-card': '#1E293B',
        'transit-accent': '#38BDF8',
        'transit-green': '#10B981',
        'transit-red': '#EF4444'
      }
    },
  },
  plugins: [],
}
