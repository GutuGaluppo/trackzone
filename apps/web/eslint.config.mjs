import base from '@trackzone/config/eslint/base';
import next from 'eslint-config-next/core-web-vitals';

// Order matters: eslint-config-next ships Babel's parser, which has no
// TypeScript parser services. `base` must come last so its
// @typescript-eslint/parser wins for .ts/.tsx files.
const config = [...next, ...base, { ignores: ['.next/**', 'next-env.d.ts'] }];

export default config;
