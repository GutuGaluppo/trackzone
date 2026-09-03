import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Shared flat config for every TrackZone package.
 *
 * Restricting the service-role client to server code is enforced by the
 * `server-only` package (a hard build failure if it reaches the client
 * bundle), not by lint — that guarantee is stronger than a path pattern and
 * doesn't false-positive on the server modules that are supposed to use it.
 */
export default tseslint.config(
  { ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**', '**/coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'smart'],
    },
  },
);
