// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", // 👈 이 줄
    "./src/**/*.{js,ts,jsx,tsx}", // 👈 이 줄이 가장 중요합니다!
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
