/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#2563EB", dark: "#1D4ED8", light: "#3B82F6" },
        secondary: { DEFAULT: "#14B8A6", dark: "#0D9488" },
        accent: { DEFAULT: "#22C55E" },
        surface: { DEFAULT: "#F8FAFC", card: "#FFFFFF" },
        ink: { DEFAULT: "#1E293B", muted: "#64748B" }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 4px 24px rgba(37,99,235,0.06)"
      }
    }
  },
  plugins: []
};
