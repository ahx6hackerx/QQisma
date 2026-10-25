/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'IBM Plex Sans Arabic'", "'IBM Plex Sans'", "system-ui", "sans-serif"],
        display: ["'Cairo'", "'IBM Plex Sans Arabic'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        // Ink — the primary structural/neutral color (sidebar, headings, text)
        ink: {
          50: "#F4F6F7",
          100: "#E4E9EB",
          200: "#C4CDD2",
          300: "#94A3AB",
          400: "#5F717A",
          500: "#3E4E57",
          600: "#2C3940",
          700: "#212B31",
          800: "#16202B", // primary sidebar/ink
          900: "#0F171F",
        },
        // Parchment — warm document-registry background
        parchment: {
          50: "#FDFCFA",
          100: "#FAF7F0",
          200: "#F3EEE1",
          300: "#E9E1CC",
        },
        // Brass — primary accent (verified/approved/CTA)
        brass: {
          50: "#FBF4E6",
          100: "#F3E2BB",
          300: "#D8B26B",
          400: "#C9973B",
          500: "#B8863B",
          600: "#96692C",
          700: "#764F20",
        },
        // Sage — confirmed/matched positive state
        sage: {
          50: "#EEF4F0",
          100: "#D6E6DB",
          400: "#5C8E6C",
          500: "#4C7A5D",
          600: "#3B5F49",
        },
        // Terracotta — disputes / alerts (reserved, used sparingly)
        clay: {
          50: "#FBEEE8",
          100: "#F3D6C7",
          400: "#C1522E",
          500: "#A8431F",
          600: "#8A3419",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(22, 32, 43, 0.06), 0 1px 1px rgba(22, 32, 43, 0.04)",
      },
    },
  },
  plugins: [],
};
