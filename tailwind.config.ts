import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f4f1ea",
        ink: "#1c2b33",
        muted: "#3e4c54",
        line: "#ddd4c8",
        teal: "#0e4d56",
        "teal-dark": "#0a3c43",
        card: "#fffcf7",
        copper: "#8a4b24",
      },
      boxShadow: {
        card: "0 1px 2px rgba(28, 43, 51, 0.06), 0 8px 24px rgba(28, 43, 51, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
