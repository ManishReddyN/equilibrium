const fs = require('fs');
const path = require('path');

// Feature isolation (plan section 3.1: "features never import from other
// features; cross-feature needs go through shared/ or lib/"). Read once at
// config-load time so new feature folders are picked up automatically.
const featuresDir = path.resolve(__dirname, 'src/features');
const featureNames = fs
  .readdirSync(featuresDir)
  .filter(entry => fs.statSync(path.join(featuresDir, entry)).isDirectory());

module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // `@typescript-eslint/no-floating-promises` requires every fire-and-forget
    // promise to be explicitly marked with the `void` operator (e.g.
    // `void this.queryClient.invalidateQueries(...)`, used throughout
    // features/notifications/services/realtime.ts and every mutation's
    // onSuccess invalidation). The base `no-void` rule otherwise flags that
    // exact pattern, so it's narrowed to only disallow `void` in
    // non-statement (expression) position, where its original "don't rely on
    // `void` producing `undefined`" intent actually applies.
    'no-void': ['warn', {allowAsStatement: true}],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      extends: ['plugin:@typescript-eslint/recommended-type-checked'],
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    // One override per feature folder, banning the `@features/<other>/*`
    // alias for every *other* feature from within this feature's own files.
    // This caught a real violation during Phase 3
    // (features/household/components/HouseholdScreen.tsx importing
    // features/auth/services/auth to call `signOut`, fixed by calling
    // `supabase.auth.signOut()` directly instead) and will fail lint on any
    // recurrence. Only covers the `@features/*` alias form since that's the
    // exclusive cross-file import style used throughout this codebase
    // (verified via `grep -rn "@features/" src/features`); a relative
    // `../../other-feature/...` import would not be caught here.
    ...featureNames.map(featureName => ({
      files: [`src/features/${featureName}/**/*.ts`, `src/features/${featureName}/**/*.tsx`],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: featureNames
              .filter(other => other !== featureName)
              .map(other => `@features/${other}/*`),
          },
        ],
      },
    })),
    {
      files: ['jest.setup.js', 'jest.config.js'],
      env: {jest: true},
    },
  ],
};
