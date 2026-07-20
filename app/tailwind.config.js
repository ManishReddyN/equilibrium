module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // "Confident utility" redesign (2026-07-20, see docs/DECISIONS.md): teal
      // stays the brand color (Splitwise's is teal too) but deepened one step
      // for a less-candy, more deliberate primary, and used more sparingly at
      // the component level; canvas/border/ink keep the same slate scale.
      // success/danger are new — semantic status color, not previously needed
      // beyond the single amber `warn`.
      colors: {
        canvas: '#F8FAFC', // slate-50 base
        primary: '#0F766E', // teal-700 (deepened from teal-600 for a more confident CTA color)
        'primary-soft': '#CCFBF1',
        border: '#E2E8F0', // slate-200
        warn: '#D97706', // amber-600 — ONLY for out-of-equilibrium states
        success: '#059669', // emerald-600
        danger: '#DC2626', // red-600
        ink: '#0F172A',
        'ink-muted': '#64748B',
      },
      fontFamily: {
        sans: ['PlusJakartaSans-Regular'],
        'sans-medium': ['PlusJakartaSans-Medium'],
        'sans-semibold': ['PlusJakartaSans-SemiBold'],
        'sans-bold': ['PlusJakartaSans-Bold'],
      },
      borderRadius: {card: '14px', control: '10px'},
    },
  },
  plugins: [],
};
