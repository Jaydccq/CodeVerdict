import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'background-light': '#f8f6f6',
        'background-dark': '#0a0c10',
        'surface-dark': 'rgb(var(--color-surface-dark) / <alpha-value>)',
        'border-dark': 'rgb(var(--color-border-dark) / <alpha-value>)',
        'accent-navy': '#111827',
      },
      fontFamily: {
        sans: ['Figtree', 'sans-serif'],
        display: ['Figtree', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Courier New"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem',
      },
    },
  },
  plugins: [forms],
} satisfies Config;
