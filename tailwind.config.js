/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    // ✅ брейкпоінти (зберігаємо стандартні + додаємо свої)
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",

      // твої назви (можеш використовувати iphone:..., tablet:..., desktop:...)
      iphone: "390px",
      tablet: "768px",
      desktop: "1024px", // ✅ важливо: зроби desktop від 1024, а не 1440
      wide: "1440px",    // ✅ окремо для великих екранів
    },

    extend: {
      // ✅ кольори через CSS variables
      colors: {
        appBg: "rgb(var(--app-bg) / <alpha-value>)",
        appText: "rgb(var(--app-text) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
