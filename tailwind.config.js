/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        workspace: {
          bg: "#0F1117",
          card: "#1C212B",
          border: "#2A3140",
          accent: "#4DA3FF"
        }
      },
      boxShadow: {
        panel: "0 20px 60px rgba(0,0,0,0.35)"
      },
      borderRadius: {
        workspace: "16px"
      }
    }
  },
  plugins: []
};
