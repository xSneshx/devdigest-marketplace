import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'public/site-index.json', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Untrusted text must be rendered as JSX text.',
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message: 'Use CSS Modules; inline styles are blocked by the CSP.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/scripts/ci/**'], message: 'Site code must not import repository CI scripts.' },
            { group: ['**/tests/**'], message: 'Site code must not import repository tests.' },
            { group: ['**/plugins/**'], message: 'Site code must never import plugin files.' },
          ],
        },
      ],
    },
  },
);
