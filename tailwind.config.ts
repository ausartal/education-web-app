import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary-blue)',
          cyan: 'var(--primary-cyan)',
          orange: 'var(--primary-orange)',
          bg: 'var(--primary-bg)',
        },
        success: {
          DEFAULT: 'var(--success-green)',
          light: 'var(--success-light)',
          dark: 'var(--success-dark)',
        },
        warning: {
          DEFAULT: 'var(--warning-orange)',
          light: 'var(--warning-light)',
          dark: 'var(--warning-dark)',
        },
        error: {
          DEFAULT: 'var(--error-red)',
          light: 'var(--error-light)',
          dark: 'var(--error-dark)',
        },
        gray: {
          50: 'var(--gray-50)',
          100: 'var(--gray-100)',
          200: 'var(--gray-200)',
          300: 'var(--gray-300)',
          400: 'var(--gray-400)',
          500: 'var(--gray-500)',
          600: 'var(--gray-600)',
          700: 'var(--gray-700)',
          800: 'var(--gray-800)',
          900: 'var(--gray-900)',
        },
        info: {
          DEFAULT: 'var(--info-blue)',
          light: 'var(--info-light)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
        math: ['var(--font-math)'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        primary: 'var(--shadow-primary)',
        success: 'var(--shadow-success)',
        warning: 'var(--shadow-warning)',
      },
      transitionTimingFunction: {
        'ease-in': 'var(--ease-in)',
        'ease-out': 'var(--ease-out)',
        'ease-in-out': 'var(--ease-in-out)',
        bounce: 'var(--ease-bounce)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
        slower: 'var(--duration-slower)',
      },
    },
  },
  plugins: [],
};
export default config;
