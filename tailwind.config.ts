import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        brand: {
          DEFAULT: "#4f8cff",
          foreground: "#ffffff",
        },
        accent: {
          gold: "#c9a962",
          "gold-muted": "rgba(201, 169, 98, 0.35)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(79, 140, 255, 0.08)",
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(ellipse 120% 80% at 50% -20%, rgba(79, 140, 255, 0.18), transparent 55%), radial-gradient(ellipse 80% 50% at 100% 0%, rgba(201, 169, 98, 0.08), transparent 45%), linear-gradient(180deg, #fafbff 0%, #f4f7ff 50%, #ffffff 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
