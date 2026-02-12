import { FlatCompat } from '@eslint/eslintrc';
import importPlugin from 'eslint-plugin-import-x';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

// Replace eslint-plugin-import with eslint-plugin-import-x for ESLint 10 compatibility
const airbnbBase = compat.extends('airbnb-base').map((config) => {
  if (config.plugins?.import) {
    return { ...config, plugins: { ...config.plugins, import: importPlugin } };
  }
  return config;
});

export default [
  ...airbnbBase,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      quotes: ['error', 'single'],
      'no-underscore-dangle': 'off',
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      'import/extensions': ['error', 'ignorePackages'],
    },
  },
  {
    ignores: ['web/public/**', 'node_modules/**', 'lib/ssh2-sftp-client.js', 'test/**'],
  },
];
