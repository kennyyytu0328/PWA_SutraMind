import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        zen: {
          bg: '#121212',
          surface: '#1E1E1E',
          text: '#EAE0D5',
          muted: '#8A8079',
          accent: '#C9A961',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', 'serif'],
        sans: ['"Noto Sans TC"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'breath': 'breath 5s ease-in-out infinite',
      },
      keyframes: {
        breath: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.95)' },
          '50%': { opacity: '0.9', transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
