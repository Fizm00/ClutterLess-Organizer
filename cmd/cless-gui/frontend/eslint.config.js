import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

const noArbitraryTailwindRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow arbitrary Tailwind CSS values (e.g. bg-[#...], p-[...]) per DESIGN.md',
    },
    schema: [],
  },
  create(context) {
    function checkString(node, str) {
      if (typeof str !== 'string') return;
      const tokens = str.trim().split(/\s+/);
      for (const token of tokens) {
        // Strip variant prefixes like hover:, focus:, data-[...]:, aria-[...]:
        const baseUtility = token.replace(/^(?:[a-zA-Z0-9_-]+(?:-\[[^\]]+\])?:)+/, '');
        // Arbitrary values have -[...] in their property assignment (e.g. bg-[#123], p-[13px])
        if (/^[a-zA-Z0-9_-]+-\[[^\]]+\]$/.test(baseUtility)) {
          context.report({
            node,
            message: `Arbitrary Tailwind value "${token}" is strictly forbidden by DESIGN.md anti-slop rules. Use locked theme tokens instead.`,
          });
        }
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          checkString(node, node.value);
        }
      },
      TemplateElement(node) {
        checkString(node, node.value?.raw);
      },
    };
  },
};

export default [
  {
    ignores: ['dist/**', 'bindings/**', 'node_modules/**', 'src/components/ui/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'custom-rules': {
        rules: {
          'no-arbitrary-tailwind': noArbitraryTailwindRule,
        },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      'custom-rules/no-arbitrary-tailwind': 'error',
    },
  },
];
