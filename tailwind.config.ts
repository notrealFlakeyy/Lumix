import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './modules/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background))',
        foreground: 'rgb(var(--foreground))',
        card: 'rgb(var(--card))',
        'card-foreground': 'rgb(var(--card-foreground))',
        muted: 'rgb(var(--muted))',
        'muted-foreground': 'rgb(var(--muted-foreground))',
        border: 'rgb(var(--border))',
        input: 'rgb(var(--input))',
        ring: 'rgb(var(--ring))',
        primary: 'rgb(var(--primary))',
        'primary-foreground': 'rgb(var(--primary-foreground))',
        secondary: 'rgb(var(--secondary))',
        'secondary-foreground': 'rgb(var(--secondary-foreground))',
        accent: 'rgb(var(--accent))',
        'accent-foreground': 'rgb(var(--accent-foreground))',
        destructive: 'rgb(var(--destructive))',
        'destructive-foreground': 'rgb(var(--destructive-foreground))',
        app: {
          bg: 'rgb(var(--app-bg))',
          fg: 'rgb(var(--app-fg))',
        },
      },
      backgroundImage: {
        'btn-gradient': 'linear-gradient(to right, rgb(var(--btn-from)), rgb(var(--btn-to)))',
        'app-ambient':
          'radial-gradient(1200px circle at 15% -10%, rgba(var(--btn-from), 0.18) 0%, rgba(var(--btn-from), 0) 60%), radial-gradient(900px circle at 85% 0%, rgba(var(--btn-to), 0.14) 0%, rgba(var(--btn-to), 0) 55%)',
      },
      boxShadow: {
        soft: '0 1px 0 rgba(255,255,255,0.06), 0 20px 50px rgba(0,0,0,0.35)',
        softSm: '0 1px 0 rgba(255,255,255,0.05), 0 12px 32px rgba(0,0,0,0.28)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    plugin(({ addUtilities }) => {
      addUtilities({
        '.bg-app': { backgroundColor: 'rgb(var(--app-bg))' },
        '.text-app': { color: 'rgb(var(--app-fg))' },
        '.border-app': { borderColor: 'rgb(var(--border))' },
        '.btn-gradient': {
          backgroundImage: 'linear-gradient(to right, rgb(var(--btn-from)), rgb(var(--btn-to)))',
        },
      })
    }),
  ],
}

export default config
