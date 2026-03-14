import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Výchozí téma: Oceán (přepisuje se CSS proměnnými)
        primary:   'var(--color-primary)',
        'primary-mid': 'var(--color-primary-mid)',
        'primary-light': 'var(--color-primary-light)',
        'primary-pale': 'var(--color-primary-pale)',
      },
      borderRadius: {
        app: '14px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}

export default config
