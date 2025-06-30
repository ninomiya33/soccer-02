/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        button: '1rem', // !rounded-button 対応
      },
      colors: {
        primary: '#2563eb',     // 青系（例：bg-primary）
        secondary: '#10b981',   // 緑系（例：bg-secondary）
      },
    },
  },
  plugins: [],
};
