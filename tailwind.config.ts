import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "sans-serif"],
      },
      colors: {
        // Palet hijau pesantren Lptq Blokagung dengan struktur token ala Koki
        brand: {
          DEFAULT: "#047857",
          hover: "#065f46",
          light: "#d1fae5",
          dark: "#065f46",
          darker: "#064e3b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
