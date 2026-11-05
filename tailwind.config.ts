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
        abyss: {
          950: "#03060C",
          900: "#060B16",
          800: "#0A1324",
          700: "#101E38",
          600: "#182C52",
        },
        azure: {
          DEFAULT: "#00E5FF",
          400: "#38BDF8",
          500: "#00E5FF",
          600: "#0284C7",
          glow: "rgba(0, 229, 255, 0.35)",
        },
        rarity: {
          milspec: "#3B82F6",
          restricted: "#8B5CF6",
          classified: "#EC4899",
          covert: "#EF4444",
          gold: "#F59E0B",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "sans-serif"],
        display: ["var(--font-space)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "cyber-grid":
          "linear-gradient(to right, rgba(0, 229, 255, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 229, 255, 0.04) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
export default config;
