import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: "#101a64",
        blue: "#1737a7",
        sky: "#24b8f2",
        pink: "#ef3c83",
        yellow: "#ffc928",
        purple: "#7139aa",
        ink: "#17203c",
        muted: "#68708a",
        bg: "#f7f9ff",
      },
      fontFamily: {
        sans: ["Tahoma", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 12px 34px rgba(16,26,100,.10)",
      },
      borderRadius: {
        xl2: "20px",
      },
    },
  },
  plugins: [],
};
export default config;
