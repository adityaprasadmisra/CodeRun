/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        editor: {
          bg: "#1e1e1e",
          sidebar: "#252526",
          status: "#007acc"
        },
        brand: {
          bg: "#090a0f",
          card: "rgba(17, 18, 25, 0.65)",
          border: "rgba(255, 255, 255, 0.07)",
          glow: "#3b82f6",
          emerald: "#10b981",
          violet: "#8b5cf6",
          rose: "#f43f5e"
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
