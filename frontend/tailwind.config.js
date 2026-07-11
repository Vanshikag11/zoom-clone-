/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        zoomblue: "#2D8CFF",
        zoomdark: "#1C1C1E",
        zoompanel: "#232333",
      },
    },
  },
  plugins: [],
};
