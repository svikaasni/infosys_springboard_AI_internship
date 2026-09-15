/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0b0f14',
          900: '#111826',
          800: '#1a2332',
          700: '#243044',
          600: '#334155',
        },
        signal: {
          50: '#eefcf5',
          100: '#d3f8e4',
          400: '#3ddc97',
          500: '#22c58f',
          600: '#16a374',
        },
        alert: {
          critical: '#f2495c',
          high: '#f5a524',
          medium: '#4fb2f0',
          low: '#8a94a6',
        },
        // Theme-reactive tokens: these read from CSS custom properties that
        // flip between the ":root" (dark, default) and ".light" values
        // defined in index.css, so a single class toggle on <html> re-themes
        // every component that uses them — no per-component dark:/light:
        // variant classes needed. `ink`/`signal`/`alert` above stay static
        // literals on purpose (e.g. text-ink-950 on a bright signal-500
        // button must always render dark, in either theme).
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        overlay: 'rgb(var(--color-overlay) / <alpha-value>)',
        slate: {
          50: 'rgb(var(--slate-50) / <alpha-value>)',
          100: 'rgb(var(--slate-100) / <alpha-value>)',
          200: 'rgb(var(--slate-200) / <alpha-value>)',
          300: 'rgb(var(--slate-300) / <alpha-value>)',
          400: 'rgb(var(--slate-400) / <alpha-value>)',
          500: 'rgb(var(--slate-500) / <alpha-value>)',
          600: 'rgb(var(--slate-600) / <alpha-value>)',
          700: 'rgb(var(--slate-700) / <alpha-value>)',
          800: 'rgb(var(--slate-800) / <alpha-value>)',
          900: 'rgb(var(--slate-900) / <alpha-value>)',
          950: 'rgb(var(--slate-950) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
}
