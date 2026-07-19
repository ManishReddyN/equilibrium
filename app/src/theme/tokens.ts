/**
 * TS mirror of tailwind.config.js's colors/radii, for contexts that can't consume
 * NativeWind className strings: Skia canvas draws and Reanimated interpolateColor
 * inputs both need raw values, not utility classes. Keep this in sync with
 * tailwind.config.js by hand -- there are only a handful of tokens.
 */
export const colors = {
  canvas: '#F8FAFC',
  primary: '#0D9488',
  primarySoft: '#CCFBF1',
  border: '#E2E8F0',
  warn: '#D97706',
  ink: '#0F172A',
  inkMuted: '#64748B',
} as const;

export const radii = {
  card: 16,
  control: 12,
} as const;

/**
 * `CompletionCelebration`'s particle burst (plan section 4.1: "120 particles,
 * teal/sage palette... no confetti emoji imagery -- abstract circles and
 * rounded rects only"). Teal shades from `colors.primary` plus two sage-green
 * accents for contrast against the canvas background.
 */
export const celebrationPalette = [
  '#0D9488', // primary teal
  '#2DD4BF', // lighter teal
  '#5EEAD4', // pale teal
  '#84A98C', // sage
  '#52796F', // deep sage
] as const;

export const fontFamily = {
  sans: 'Nunito-Regular',
  sansMedium: 'Nunito-Medium',
  sansSemibold: 'Nunito-SemiBold',
  sansBold: 'Nunito-Bold',
} as const;
