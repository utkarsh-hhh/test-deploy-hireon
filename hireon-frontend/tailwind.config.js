/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary brand violet
        violet: {
          DEFAULT: '#6c47ff',
          mid:     '#8b6bff',
          light:   '#a98bff',
          50:      '#f5f0ff',
          100:     '#ece8ff',
          200:     '#ddd6fe',
          300:     '#c4b5fd',
          400:     '#a78bfa',
          500:     '#8b5cf6',
          600:     '#6c47ff',
          700:     '#5535d4',
          800:     '#4527aa',
          900:     '#321d80',
        },
        // Design-system named colors
        'pink-hi':      '#ff6bc6',
        'pink-light':   '#ff9dd7',
        'teal-hi':      '#00d4c8',
        'teal-light':   '#5eead4',
        'amber-hi':     '#fbbf24',
        'text-dark':    '#1a1040',
        'text-mid':     '#5a4e7a',
        'text-light':   '#9689bb',
        'bg-lavender':  '#f0eeff',
        'bg-lavender2': '#ece8ff',
        // Keep legacy brand scale for backward compatibility
        brand: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#6c47ff',
          700: '#5535d4',
          800: '#4527aa',
          900: '#321d80',
        },
        accent: {
          pink:  '#ff6bc6',
          teal:  '#00d4c8',
          amber: '#fbbf24',
        },
      },

      fontFamily: {
        sans:     ['Sora', 'system-ui', 'sans-serif'],
        sora:     ['Sora', 'sans-serif'],
        fraunces: ['Fraunces', 'serif'],
        display:  ['Sora', 'system-ui', 'sans-serif'],
        serif:    ['Fraunces', 'Georgia', 'serif'],
      },

      borderRadius: {
        'card-sm': '10px',
        'card-md': '16px',
        'card-lg': '24px',
      },

      boxShadow: {
        card:       '0 8px 40px rgba(108, 71, 255, 0.10)',
        'card-hover': '0 20px 60px rgba(108, 71, 255, 0.18)',
        glass:      '0 8px 32px rgba(108, 71, 255, 0.12)',
        'glass-sm': '0 4px 16px rgba(108, 71, 255, 0.08)',
        violet:     '0 4px 14px rgba(108, 71, 255, 0.30)',
        'violet-lg':'0 8px 28px rgba(108, 71, 255, 0.40)',
        kpi:        '0 4px 24px rgba(108, 71, 255, 0.10)',
        'kpi-hover':'0 12px 40px rgba(108, 71, 255, 0.16)',
      },

      backgroundImage: {
        'gradient-brand':    'linear-gradient(135deg, #6c47ff 0%, #ff6bc6 100%)',
        'gradient-violet':   'linear-gradient(135deg, #6c47ff 0%, #8b6bff 100%)',
        'gradient-teal':     'linear-gradient(135deg, #00d4c8 0%, #5eead4 100%)',
        'gradient-pink':     'linear-gradient(135deg, #ff6bc6 0%, #ff9dd7 100%)',
        'gradient-amber':    'linear-gradient(135deg, #fbbf24 0%, #fde68a 100%)',
      },

      animation: {
        'fade-in':      'fadeIn 0.3s ease-in-out',
        'slide-up':     'slideUp 0.3s ease-out',
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'orbit-spin':   'orbit-spin 5s linear infinite',
        'drift-a':      'driftA 12s ease-in-out infinite alternate',
        'drift-b':      'driftB 15s ease-in-out infinite alternate',
        'drift-c':      'driftC 10s ease-in-out infinite alternate',
        'grow-width':   'growWidth 1.2s ease both',
        'fade-up':      'fadeUp 0.6s ease both',
      },

      keyframes: {
        fadeIn:     { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:    { from: { transform: 'translateY(10px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        fadeUp:     { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'orbit-spin': { to: { transform: 'rotate(360deg)' } },
        driftA:     { from: { transform: 'translate(0,0) scale(1)' }, to: { transform: 'translate(40px,-60px) scale(1.1)' } },
        driftB:     { from: { transform: 'translate(0,0) scale(1)' }, to: { transform: 'translate(-30px,50px) scale(1.05)' } },
        driftC:     { from: { transform: 'translate(0,0)' }, to: { transform: 'translate(60px,-40px)' } },
        growWidth:  { from: { width: '0%' } },
      },
    },
  },
  plugins: [],
}
