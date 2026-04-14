/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        nibo: {
          purple:  '#6431e2',
          purpleH: '#5229c5',
          blue:    '#0072ce',
          blueLt:  '#41b6e6',
          petroleo:'#002d72',
          ice:     '#b8ccea',
          bg:      '#eef2f8',
          text:    '#0d1b3e',
          muted:   '#4a5773',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Helvetica Neue', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
