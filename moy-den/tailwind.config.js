/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Nunito', 'system-ui', 'sans-serif'] },
      colors: {
        bg: '#FFF9F0',
        ink: '#3A3340',
        ink2: '#6B6272',
        pink: { DEFAULT: '#F7A8C4', strong: '#E75480', soft: '#FDE4EE', text: '#A82A58' },
        sun: { DEFAULT: '#FFD966', strong: '#F5B700', soft: '#FFF4CC', text: '#8A6500' },
        leaf: { DEFAULT: '#A8DDB5', strong: '#4DB06E', soft: '#E3F5E8', text: '#2A7A47' },
      },
      borderRadius: { card: '22px', btn: '18px' },
      boxShadow: { card: '0 4px 18px rgba(58,51,64,.07)' },
      transitionDuration: { DEFAULT: '200ms' },
    },
  },
  plugins: [],
}
