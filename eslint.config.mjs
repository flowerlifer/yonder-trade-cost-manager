import tseslint from 'typescript-eslint';

export default tseslint.config(
  {ignores: ['.next/**', 'node_modules/**', 'package/**', 'next-env.d.ts']},
  ...tseslint.configs.recommended,
);
