import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f4f1ea",
        ink: "#1c2b33",
        muted: "#4f5d65",
        line: "#d6cfc3",
        teal: "#0e4d56",
        "teal-dark": "#0a3c43",
        "teal-soft": "#e4efef",
        card: "#fffdf9",
        copper: "#8a4b24",
        sand: "#f8efe6",
        gold: "#e7c27a",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        overlay: "0 12px 40px rgba(28, 43, 51, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
