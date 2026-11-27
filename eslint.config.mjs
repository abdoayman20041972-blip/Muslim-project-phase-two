// Minimal lint config (see scripts/lint.sh, which installs ESLint in a separate folder because the project's
// TypeScript 7 is newer than typescript-eslint supports). Goal: catch real bugs, not style.
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['.output/**', 'dist/**', 'android/**', 'node_modules/**', 'public/**', 'src/routeTree.gen.ts', 'plugins/**', '**/*.mjs.map'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // warning, not error: PrayerSourceCard calls a plain function named useGps from a click handler
      // (a naming false positive, not a hook).
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    // scripts/quran-center-evidence.mjs runs callbacks inside a browser page, so it uses document.
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // Style-level findings stay visible as warnings; only real errors fail the run.
    rules: {
      'no-useless-escape': 'warn',
      'no-regex-spaces': 'warn',
      'no-misleading-character-class': 'warn',
      'prefer-const': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      '@typescript-eslint/no-empty-object-type': 'warn',
    },
  },
)
