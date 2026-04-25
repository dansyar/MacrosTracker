import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0f0c",
          elevated: "#111815",
          card: "#161e1a",
        },
        accent: {
          DEFAULT: "#22c55e",
          hover: "#16a34a",
          muted: "#15803d",
        },
        border: {
          DEFAULT: "#1f2a24",
          subtle: "#1a231e",
        },
        fg: {
          DEFAULT: "#e6f0ea",
          muted: "#9aa8a0",
          dim: "#6b7872",
        },
        danger: "#ef4444",
        warn: "#f59e0b",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
