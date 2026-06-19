/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0e14", panel: "#111824", panel2: "#161f2c", line: "#222d3d",
        text: "#e8eef6", muted: "#8a98ab", faint: "#586676",
        brand: "#4f8bff", dell: "#0085c3",
        healthy: "#3fb98a", risk: "#e0a92e", critical: "#e0564f",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
