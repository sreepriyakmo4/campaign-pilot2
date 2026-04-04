/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["Inter", "system-ui", "sans-serif"],
        display: ["Playfair Display", "Georgia", "serif"],
      },
      colors: {
        gold: {
          DEFAULT: "#C9A84C",
          light:   "#E8C97A",
          dim:     "#8B6E2E",
        },
        surface: {
          DEFAULT: "#0e0e0e",
          2: "#141414",
          3: "#1a1a1a",
        },
      },
      animation: {
        shimmer:       "shimmer 2s infinite",
        "fade-up":     "fade-up 0.5s ease-out forwards",
        "fade-in":     "fade-in 0.3s ease-out forwards",
        "pulse-gold":  "pulse-gold 2s infinite",
      },
      keyframes: {
        shimmer:     { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(200%)" } },
        "fade-up":   { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "fade-in":   { from: { opacity: "0" }, to: { opacity: "1" } },
        "pulse-gold":{ "0%, 100%": { boxShadow: "0 0 0 0 rgba(201,168,76,0.4)" }, "50%": { boxShadow: "0 0 0 6px rgba(201,168,76,0)" } },
      },
    },
  },
  plugins: [],
};
