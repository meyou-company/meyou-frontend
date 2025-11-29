/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "meyou-bg": "#060018",
        "meyou-card": "#14052B",
        "meyou-pink": "#FF4BB5",
        "meyou-purple": "#7B5CFF",
      },
      backgroundImage: {
        "meyou-gradient": "linear-gradient(90deg, #FF4BB5 0%, #7B5CFF 100%)",
      },
    },
  },
  plugins: [],
};
