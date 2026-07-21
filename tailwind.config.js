/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: "#0f0f0f",
          surface: "#1a1a1a",
          border: "#27272a",
          accent: "#6366f1",
          "accent-hover": "#818cf8",
          text: "#fafafa",
          "text-muted": "#a1a1aa",
          success: "#22c55e",
          warning: "#eab308",
          error: "#ef4444",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
