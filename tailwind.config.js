/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Default theme: Enderman Purple
        accent: {
          DEFAULT: "var(--color-accent)",
          hover:   "var(--color-accent-hover)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          raised:  "var(--color-surface-raised)",
          border:  "var(--color-surface-border)",
        },
        bg: {
          DEFAULT: "var(--color-bg)",
          sidebar: "var(--color-bg-sidebar)",
        },
      },
      fontFamily: {
        sans: ["Inter", "Geist", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
}
