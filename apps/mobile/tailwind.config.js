/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        macro: {
          protein: '#8b5cf6', // Violet
          carbs: '#10b981',   // Emerald
          fat: '#f59e0b',     // Amber
          water: '#0ea5e9',   // Sky blue
        }
      }
    },
  },
  plugins: [],
};
