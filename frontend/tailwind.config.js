/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: '#0b0b0c',
          900: '#111113',
          800: '#18181b',
          700: '#222226',
          600: '#2d2d34',
          500: '#40404a',
          400: '#71717a',
          300: '#a1a1aa',
          200: '#e4e4e7',
          100: '#f4f4f5',
        },
        medical: {
          red: '#ef4444',
          amber: '#f59e0b',
          blue: '#0ea5e9',
          green: '#10b981',
          teal: '#06b6d4',
          glow: 'rgba(14, 165, 233, 0.4)'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['SF Pro Display', 'Inter', 'sans-serif']
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
        'glow-cyan': 'glowCyan 2s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 }
        },
        glowCyan: {
          '0%': { boxShadow: '0 0 5px rgba(6, 182, 212, 0.3), 0 0 10px rgba(6, 182, 212, 0.2)' },
          '100%': { boxShadow: '0 0 15px rgba(6, 182, 212, 0.6), 0 0 25px rgba(6, 182, 212, 0.4)' }
        }
      }
    },
  },
  plugins: [],
}
