import { readFileSync } from 'node:fs';
import { OptionDefaults } from 'typedoc';

/**
 * @import {TypeDocOptions} from "typedoc"
 */

const customFooterHtml = readFileSync(
  new URL('../site/media/footer.html', import.meta.url),
  'utf8',
);

/** @type {Partial<TypeDocOptions>} */
export default {
  basePath: process.env.GITHUB_ACTIONS ? '/bargs/' : '/',
  blockTags: [...OptionDefaults.blockTags, '@knipignore'],
  customCss: '../site/media/bargs-theme.css',
  customFooterHtml,
  darkHighlightTheme: 'vitesse-dark',
  entryPoints: ['../src/index.ts'],
  excludeExternals: true,
  excludeInternal: true,
  excludePrivate: true,
  externalSymbolLinkMappings: {
    '@types/node': {
      'util.parseArgs': 'https://nodejs.org/api/util.html#utilparseargsconfig',
    },
    typescript: {
      PromiseLike:
        'https://github.com/microsoft/TypeScript/blob/3320dfdfcf17cdcdbfccb8040ea73cf110d94ba3/src/lib/es5.d.ts', // current of Sep 9 2025
    },
  },
  favicon: '../site/media/favicon.svg',
  // @ts-expect-error from extras plugin
  footerLastModified: true,
  lightHighlightTheme: 'vitesse-light',
  markdownLinkExternal: true,
  name: 'BARGS',
  navigationLinks: {
    GitHub: 'https://github.com/boneskull/bargs',
    npm: 'https://www.npmjs.com/package/@boneskull/bargs',
  },
  out: '../docs',
  plugin: [
    './typedoc-plugin-bargs.js',
    'typedoc-plugin-mdn-links',
    'typedoc-plugin-extras',
  ],
  preserveWatchOutput: true,
  searchInComments: true,
  searchInDocuments: true,
  tsconfig: '../tsconfig.json',
};
