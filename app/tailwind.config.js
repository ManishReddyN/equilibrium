module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: '#F8FAFC', // slate-50 base
        primary: '#0D9488', // teal-600 sage
        'primary-soft': '#CCFBF1',
        border: '#E2E8F0', // slate-200
        warn: '#D97706', // amber-600 — ONLY for out-of-equilibrium states
        ink: '#0F172A',
        'ink-muted': '#64748B',
      },
      fontFamily: {
        sans: ['Nunito-Regular'],
        'sans-medium': ['Nunito-Medium'],
        'sans-semibold': ['Nunito-SemiBold'],
        'sans-bold': ['Nunito-Bold'],
      },
      borderRadius: {card: '16px', control: '12px'},
    },
  },
  plugins: [],
};
