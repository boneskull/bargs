/** @type {import('wallabyjs').IWallaby} */
export default {
  // @ts-expect-error missing type
  autoDetect: ['node:test'],
  env: {
    params: {
      env: 'DEBUG=bargs*',
    },
    runner: 'node',
    type: 'node',
  },
  files: [
    'src/**/*.ts',
    'test/**/*.ts',
    '!test/**/*.test.ts',
    'package.json',
    { instrument: false, pattern: 'test/**/fixture/**' },
    { instrument: false, pattern: 'test/**/*.test.ts.snapshot' },
  ],
  filesWithNoCoverageCalculated: ['.tmp/**/*.test.ts'],
  preloadModules: ['tsx/esm'],
  runMode: 'onsave',
  tests: [
    '.tmp/**/*.test.ts',
    'test/**/*.test.ts',
    '!node_modules/**',
    '!dist/**',
  ],
};
