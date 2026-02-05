import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'n2f-bg': '#0a0a0f',
        'n2f-surface': '#12121a',
        'n2f-elevated': '#1a1a24',
        'n2f-border': '#2a2a3a',
        'n2f-border-hover': '#3a3a4a',
        'n2f-text': '#f0f0f5',
        'n2f-text-secondary': '#a0a0b0',
        'n2f-text-muted': '#606070',
        'n2f-accent': '#f97316',
        'n2f-accent-hover': '#ea580c',
        'n2f-accent-light': '#fb923c',
        'n2f-success': '#22c55e',
        'n2f-error': '#ef4444',
        'n2f-warning': '#f59e0b',
      },
    },
  },
  plugins: [],
};

export default config;
