/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#FAF3E0', // warm cream parchment base matching the screenshot
          dark: '#F3E8D0',
          light: '#FFFDF9',
        },
        ink: {
          DEFAULT: '#0A0A0A',
          muted: '#5A5A5A',
          subtle: '#888888',
        },
        radar: {
          red: '#C92A2A',
          amber: '#D97706',
          green: '#15803D',
        },
        gridline: '#E7DCBA',
      },
      fontFamily: {
        serif: ['"Libre Baskerville"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'Menlo', 'monospace'],
      },
      borderWidth: {
        '2': '2px',
        '3': '3px',
      },
    },
  },
  plugins: [],
}
