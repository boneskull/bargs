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
  groupOrder: [
    'Documents',
    'Core API',
    'Combinators',
    'Transforms',
    'Help',
    'Theming',
    'Terminal',
    'Errors',
    'Option Types',
    'Positional Types',
    'Parser Types',
    'Type Utilities',
    '*',
  ],
  ignoredHighlightLanguages: ['mermaid'],
  kindSortOrder: [
    'Reference',
    'Project',
    'Module',
    'Namespace',
    'Function',
    'TypeAlias',
  ],
  lightHighlightTheme: 'vitesse-light',
  // llms.txt configuration
  // llmsTxtDeclarations: Auto-generation doesn't work with kind-dir router
  // for single-entry-point projects. Use empty array to disable.
  // See: https://github.com/boneskull/typedoc-plugin-llms-txt
  llmsTxtDeclarations: [],
  llmsTxtHeader: {
    description:
      'A TypeScript-first CLI argument parser wrapping Node.js util.parseArgs() with full type inference and zero runtime dependencies.',
    features: [
      'Combinator-style fluent API: `bargs("app").globals(opts).command("cmd", pos, handler)`',
      'Full type inference: options and positionals are strongly typed without manual annotations',
      'Option builders: `opt.string()`, `opt.boolean()`, `opt.number()`, `opt.enum()`, `opt.array()`, `opt.count()`',
      'Positional builders: `pos.string()`, `pos.number()`, `pos.enum()`, `pos.variadic()`',
      'Transforms: `map()` to transform results, `merge()` to combine parsers, `camelCaseValues()` for key conversion',
      'Built-in help generation with ANSI theming and terminal hyperlink support',
      'Zero runtime dependencies - only wraps Node.js built-in util.parseArgs()',
    ],
  },
  llmsTxtQuickReference: `// Simple CLI with options
import { bargs, opt } from '@boneskull/bargs';

const result = await bargs('greeter', { version: '1.0.0' })
  .options(opt.options({
    name: opt.string({ description: 'Name to greet', default: 'World' }),
    excited: opt.boolean({ aliases: ['e'], description: 'Add excitement' }),
  }))
  .parseAsync();

console.log(\`Hello, \${result.values.name}\${result.values.excited ? '!' : '.'}\`);

// Command-based CLI with positionals
import { bargs, opt, pos } from '@boneskull/bargs';

await bargs('tasks', { version: '1.0.0' })
  .globals(opt.options({
    verbose: opt.boolean({ aliases: ['v'] }),
  }))
  .command('add', pos.positionals(
    pos.string({ name: 'task', required: true }),
  ), ({ positionals }) => console.log(\`Added: \${positionals[0]}\`))
  .command('list', undefined, () => console.log('Listing tasks...'))
  .parseAsync();

// Type-safe enum options
opt.enum({ values: ['debug', 'info', 'warn', 'error'], default: 'info' })

// Variadic positionals (collects remaining args)
pos.variadic({ name: 'files' })`,
  llmsTxtSections: {
    About: { displayName: 'About', order: 3 },
    Guides: { displayName: 'Docs', order: 1 },
    Reference: { displayName: 'Reference', order: 2 },
  },
  markdownLinkExternal: true,
  name: 'BARGS',
  navigation: {
    includeGroups: true,
  },
  navigationLinks: {
    GitHub: 'https://github.com/boneskull/bargs',
    npm: 'https://www.npmjs.com/package/@boneskull/bargs',
  },
  out: '../docs',
  plugin: [
    './typedoc-plugin-bargs.js',
    'typedoc-plugin-mdn-links',
    'typedoc-plugin-extras',
    '@boneskull/typedoc-plugin-mermaid',
    'typedoc-plugin-llms-txt',
  ],
  preserveWatchOutput: true,
  router: 'kind-dir',
  searchInComments: true,
  searchInDocuments: true,
  tsconfig: '../tsconfig.json',
};
