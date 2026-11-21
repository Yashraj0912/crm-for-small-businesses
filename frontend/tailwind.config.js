/** Design tokens: warm neutral "ink" scale + one restrained green accent. Geist for UI, Geist Mono for figures. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        ink: { 50: '#f8f8f6', 100: '#f0efec', 200: '#e3e1db', 300: '#cecbc3', 400: '#a09d94', 500: '#76736a', 600: '#57554d', 700: '#3e3c36', 800: '#2a2924', 900: '#1a1916' },
        accent: { DEFAULT: '#1f6f5c', hover: '#185a4b', soft: '#e5f0ec' },
      },
      fontSize: { xs: ['12px', '16px'], sm: ['13px', '20px'], base: ['14px', '22px'], lg: ['16px', '24px'], xl: ['20px', '28px'] },
    },
  },
  plugins: [],
};
