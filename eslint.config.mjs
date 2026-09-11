import tseslint from 'typescript-eslint';
import globals from 'globals';
export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', '.build/**', '.local/**', '原型图/**'] },
  ...tseslint.configs.recommended,
  { files: ['**/*.mjs'], languageOptions: { globals: globals.node } },
  { files: ['miniprogram/**/*.ts'], languageOptions: { globals: { wx: 'readonly', App: 'readonly', Page: 'readonly' } } }
);
