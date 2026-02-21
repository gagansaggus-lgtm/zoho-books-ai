import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        finance: {
          income: "#10b981",
          expense: "#ef4444",
          pending: "#f59e0b",
          paid: "#22c55e",
          overdue: "#dc2626",
          partial: "#8b5cf6",
          draft: "#6b7280",
        },
      },
    },
  },
  plugins: [],
};

export default config;
