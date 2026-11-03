import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';

export default defineConfig(
  {
    ignores: [
      'node_modules/',
      'test-results/',
      'playwright-report/',
      'blob-report/',
      'playwright/.cache/',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Fixed waits and network-idle waits make tests flaky.
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-networkidle': 'error',
      // Helpers named expect* assert on behalf of the test.
      'playwright/expect-expect': ['warn', { assertFunctionPatterns: ['^expect[A-Z]'] }],
    },
  },
  // Last, so it turns off rules that conflict with Prettier.
  prettier,
);
