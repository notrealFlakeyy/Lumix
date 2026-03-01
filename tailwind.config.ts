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
          surface: 'rgb(var(--app-surface))',
          contrast: 'rgb(var(--app-contrast))',
          fg: 'rgb(var(--app-fg))',
          muted: 'rgb(var(--app-muted))',
          accent: 'rgb(var(--app-accent))',
          accent2: 'rgb(var(--app-accent-2))',
        },
      },
      backgroundImage: {
        'app-ambient':
          'radial-gradient(1100px circle at 18% -15%, rgba(var(--app-accent), 0.10) 0%, rgba(var(--app-accent), 0) 60%), radial-gradient(900px circle at 85% 0%, rgba(var(--app-accent-2), 0.14) 0%, rgba(var(--app-accent-2), 0) 55%)',
      },
      boxShadow: {
        soft: '0 1px 0 rgba(0,0,0,0.03), 0 14px 30px rgba(0,0,0,0.10)',
        softSm: '0 1px 0 rgba(0,0,0,0.03), 0 10px 20px rgba(0,0,0,0.08)',
        glow: '0 0 0 1px rgba(var(--app-accent), 0.28), 0 0 24px rgba(var(--app-accent), 0.18)',
        glowSm: '0 0 0 1px rgba(var(--app-accent), 0.22), 0 0 16px rgba(var(--app-accent), 0.14)',
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
        '.bg-surface': { backgroundColor: 'rgb(var(--app-surface))' },
        '.text-strong': { color: 'rgb(var(--app-contrast))' },
        '.text-accent': { color: 'rgb(var(--app-accent))' },
      })
    }),
  ],
}

export default config
