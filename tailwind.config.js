/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // GEM-inspired color palette using CSS variables for theme switching
        'bg': 'var(--color-bg)',
        'bg-alt': 'var(--color-bg-alt)',
        'surface': 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        'text': 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        'text-subtle': 'var(--color-text-subtle)',

        // Desert & Stone tones - accent colors
        'gold': {
          DEFAULT: 'var(--color-gold)',
          light: 'var(--color-gold-light)',
          dark: 'var(--color-gold-dark)',
        },
        'bronze': {
          DEFAULT: 'var(--color-bronze)',
          light: 'var(--color-bronze-light)',
        },
        'sand': 'var(--color-sand)',
        'limestone': 'var(--color-limestone)',
        'basalt': 'var(--color-basalt)',
        'midnight': 'var(--color-midnight)',

        // UI colors
        'border': 'var(--color-border)',
        'border-light': 'var(--color-border-light)',
        'focus': 'var(--color-gold)',
        'error': '#b91c1c',
        'success': '#15803d',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.02em' }],
        'sm': ['0.875rem', { lineHeight: '1.6', letterSpacing: '0.01em' }],
        'base': ['1rem', { lineHeight: '1.7', letterSpacing: '0' }],
        'lg': ['1.125rem', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
        'xl': ['1.25rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.02em' }],
        '3xl': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.03em' }],
        '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
        '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
        '8xl': ['6rem', { lineHeight: '0.95', letterSpacing: '-0.04em' }],
      },
      borderRadius: {
        'gem': '2px', // Sharp, architectural corners
      },
      boxShadow: {
        'stone': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'stone-md': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'stone-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        'monumental': '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
        'inner-light': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
      transitionTimingFunction: {
        'monumental': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
