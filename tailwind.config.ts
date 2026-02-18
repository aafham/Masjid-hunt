import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        base: "#f4f7f2",
        ink: "#10281f",
        brand: "#2f7a59",
        brandDark: "#1f5b42",
        accent: "#d7e8de"
      }
    }
  },
  plugins: []
};

export default config;
