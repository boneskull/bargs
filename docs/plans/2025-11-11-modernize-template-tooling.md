# Modernize Template Tooling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update GitHub template repository with modern Node.js tooling preferences: ESLint v9+, node:test, bupkis assertions, TypeScript configs from modestbench, BlueOak license, and renovate.json5

**Architecture:** Migrate from legacy ESLint configuration (.eslintrc.yml) to ESLint v9+ flat config, replace Mocha/Unexpected testing stack with node:test/bupkis, update TypeScript configuration to match modestbench standards, modernize Renovate config to JSON5 format, and update license to BlueOak-1.0.0

**Tech Stack:** ESLint 9+, typescript-eslint, node:test (built-in), bupkis, TypeScript 5.9+, prettier 3+, husky 9+, lint-staged, commitlint, cspell, markdownlint-cli2

---

## Task 1: Update License to BlueOak-1.0.0

**Files:**

- Modify: `/Users/boneskull/projects/boneskull/boneskull-template/LICENSE`
- Modify: `/Users/boneskull/projects/boneskull/boneskull-template/package.json:11`

**Step 1: Replace LICENSE file content**

Replace the entire Apache-2.0 license text with BlueOak-1.0.0:

```markdown
# Blue Oak Model License

Version 1.0.0

## Purpose

This license gives everyone as much permission to work with
this software as possible, while protecting contributors
from liability.

## Acceptance

In order to receive this license, you must agree to its
rules. The rules of this license are both obligations
under that agreement and conditions to your license.
You must not do anything with this software that triggers
a rule that you cannot or will not follow.

## Copyright

Each contributor licenses you to do everything with this
software that would otherwise infringe that contributor's
copyright in it.

## Notices

You must ensure that everyone who gets a copy of
any part of this software from you, with or without
changes, also gets the text of this license or a link to
<https://blueoakcouncil.org/license/1.0.0>.

## Excuse

If anyone notifies you in writing that you have not
complied with [Notices](#notices), you can keep your
license by taking all practical steps to comply within 30
days after the notice. If you do not do so, your license
ends immediately.

## Patent

Each contributor licenses you to do everything with this
software that would otherwise infringe any patent claims
they can license or become able to license.

## Reliability

No contributor can revoke this license.

## No Liability

**_As far as the law allows, this software comes as is,
without any warranty or condition, and no contributor
will be liable to anyone for any damages related to this
software or this license, under any kind of legal claim._**
```

**Step 2: Update package.json license field**

Update the license field in package.json:

```json
"license": "BlueOak-1.0.0",
```

**Step 3: Verify changes**

Run: `cat /Users/boneskull/projects/boneskull/boneskull-template/LICENSE | head -n 5`
Expected: Should show "# Blue Oak Model License"

**Step 4: Commit**

```bash
git add LICENSE package.json
git commit -m "chore: update license to BlueOak-1.0.0"
```

---

## Task 2: Migrate Renovate Configuration to JSON5

**Files:**

- Delete: `/Users/boneskull/projects/boneskull/boneskull-template/.renovaterc.json`
- Create: `/Users/boneskull/projects/boneskull/boneskull-template/.github/renovate.json5`

**Step 1: Create .github directory if it doesn't exist**

Run: `mkdir -p /Users/boneskull/projects/boneskull/boneskull-template/.github`

**Step 2: Create renovate.json5 with modern config**

Create `.github/renovate.json5`:

```json5
{
  $schema: 'https://docs.renovatebot.com/renovate-schema.json',
  extends: [
    'config:js-lib',
    ':enableVulnerabilityAlerts',
    ':semanticCommits',
    'group:linters',
    'group:definitelyTyped',
    'security:minimumReleaseAgeNpm',
    'helpers:pinGitHubActionDigests',
    ':configMigration',
    ':automergeDigest',
    ':automergeMinor',
  ],
  labels: ['dependencies'],
  ignorePaths: [
    '**/node_modules/**',
    '**/test/**',
    '**/demo/**',
    '**/example*/**',
  ],
  lockFileMaintenance: {
    enabled: true,
    automerge: true,
  },
}
```

**Step 3: Remove old renovaterc.json**

Run: `rm /Users/boneskull/projects/boneskull/boneskull-template/.renovaterc.json`

**Step 4: Verify new file exists**

Run: `cat /Users/boneskull/projects/boneskull/boneskull-template/.github/renovate.json5`
Expected: Should display the JSON5 config

**Step 5: Commit**

```bash
git add .renovaterc.json .github/renovate.json5
git commit -m "chore: migrate renovate config to .github/renovate.json5"
```

---

## Task 3: Remove Legacy ESLint Configuration

**Files:**

- Delete: `/Users/boneskull/projects/boneskull/boneskull-template/.eslintrc.yml`

**Step 1: Remove the old ESLint config**

Run: `rm /Users/boneskull/projects/boneskull/boneskull-template/.eslintrc.yml`

**Step 2: Verify file is removed**

Run: `ls -la /Users/boneskull/projects/boneskull/boneskull-template/.eslintrc.yml 2>&1`
Expected: Should show "No such file or directory"

**Step 3: Commit**

```bash
git add .eslintrc.yml
git commit -m "chore: remove legacy ESLint configuration"
```

---

## Task 4: Create ESLint v9+ Flat Configuration

**Files:**

- Create: `/Users/boneskull/projects/boneskull/boneskull-template/eslint.config.js`

**Step 1: Create eslint.config.js with modern flat config**

Create `eslint.config.js`:

```javascript
import jsPlugin from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import eslintPluginJsonc from 'eslint-plugin-jsonc';
import perfectionist from 'eslint-plugin-perfectionist';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  jsPlugin.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  perfectionist.configs['recommended-natural'],
  {
    languageOptions: {
      parserOptions: {
        extraFileExtensions: ['.json5', '.jsonc'],
        project: 'tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.js'],
    plugins: {
      '@perfectionist': perfectionist,
      '@stylistic': stylistic,
    },
    rules: {
      '@perfectionist/sort-classes': ['error', { partitionByNewLine: true }],
      '@stylistic/lines-around-comment': [
        'warn',
        {
          afterBlockComment: false,
          allowArrayStart: true,
          allowBlockStart: true,
          allowClassStart: true,
          allowInterfaceStart: true,
          allowObjectStart: true,
          beforeBlockComment: false,
        },
      ],
      '@stylistic/lines-between-class-members': ['error', 'always'],
      '@stylistic/semi': 'error',

      '@typescript-eslint/consistent-type-exports': [
        'error',
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          disallowTypeAnnotations: true,
          fixStyle: 'inline-type-imports',
          prefer: 'type-imports',
        },
      ],

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',

      '@typescript-eslint/no-unnecessary-boolean-literal-compare': [
        'error',
        {
          allowComparingNullableBooleansToFalse: true,
          allowComparingNullableBooleansToTrue: true,
        },
      ],

      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'warn',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',

      '@typescript-eslint/unified-signatures': [
        'error',
        {
          ignoreDifferentlyNamedParameters: true,
        },
      ],

      curly: 'error',
      'func-style': ['error', 'expression'],
      'new-cap': ['error', { capIsNew: true, newIsCap: true }],
      'no-constructor-return': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-self-compare': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-arrow-callback': 'error',
      semi: 'error',
    },
  },
  {
    files: ['test/**/*.test.ts', 'test/**/*.test.js'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    files: ['*.js', '.*.js', 'scripts/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  /** @type {any} */ (eslintPluginJsonc.configs['flat/prettier'][0]),
  /** @type {any} */ ({
    ...eslintPluginJsonc.configs['flat/prettier'][1],
    extends: [tseslint.configs.disableTypeChecked],
  }),
  /** @type {any} */ (eslintPluginJsonc.configs['flat/prettier'][2]),
  {
    ignores: [
      'docs',
      'dist',
      'coverage',
      '*.snapshot',
      '.tmp/**/*',
      'worktrees/**/*',
    ],
  },
);
```

**Step 2: Verify file is created**

Run: `cat /Users/boneskull/projects/boneskull/boneskull-template/eslint.config.js | head -n 10`
Expected: Should show the import statements

**Step 3: Commit**

```bash
git add eslint.config.js
git commit -m "feat: add ESLint v9+ flat configuration"
```

---

## Task 5: Create TypeScript Configuration from modestbench

**Files:**

- Create: `/Users/boneskull/projects/boneskull/boneskull-template/tsconfig.json`

**Step 1: Create tsconfig.json**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "lib": ["ES2023"],
    "module": "nodenext",
    "moduleDetection": "force",
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true,
    "noUncheckedSideEffectImports": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "stripInternal": true,
    "target": "esnext",
    "types": ["node"],
    "verbatimModuleSyntax": false
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.js",
    "test/**/*.ts",
    "test/**/*.js",
    "*.js",
    ".*.js",
    "scripts/**/*.ts",
    "scripts/**/*.js"
  ]
}
```

**Step 2: Verify file is created**

Run: `cat /Users/boneskull/projects/boneskull/boneskull-template/tsconfig.json`
Expected: Should display the TypeScript config

**Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "feat: add TypeScript configuration from modestbench"
```

---

## Task 6: Add cspell Configuration

**Files:**

- Create: `/Users/boneskull/projects/boneskull/boneskull-template/cspell.json`

**Step 1: Create cspell.json**

Create `cspell.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/streetsidesoftware/cspell/main/packages/cspell-types/cspell.schema.json",
  "allowCompoundWords": true,
  "caseSensitive": false,
  "dictionaries": [
    "companies",
    "css",
    "en_US",
    "filetypes",
    "fonts",
    "html",
    "misc",
    "node",
    "npm",
    "softwareTerms",
    "typescript"
  ],
  "ignorePaths": [
    ".coverage",
    ".tmp",
    ".vscode",
    "*.snapshot",
    "*.svg",
    "CHANGELOG.md",
    "coverage",
    "dist",
    "docs",
    "node_modules",
    "worktrees"
  ],
  "ignoreRandomStrings": true,
  "ignoreWords": ["boneskull"]
}
```

**Step 2: Verify file is created**

Run: `cat /Users/boneskull/projects/boneskull/boneskull-template/cspell.json`
Expected: Should display the cspell config

**Step 3: Commit**

```bash
git add cspell.json
git commit -m "feat: add cspell configuration"
```

---

## Task 7: Update package.json Dependencies and Scripts

**Files:**

- Modify: `/Users/boneskull/projects/boneskull/boneskull-template/package.json`

**Step 1: Update devDependencies section**

Replace the entire devDependencies section with:

```json
"devDependencies": {
  "@commitlint/cli": "20.1.0",
  "@commitlint/config-conventional": "20.0.0",
  "@eslint/js": "9.38.0",
  "@stylistic/eslint-plugin": "5.5.0",
  "@types/node": "24.9.2",
  "bupkis": "0.12.2",
  "cspell": "9.2.2",
  "eslint": "9.38.0",
  "eslint-plugin-jsonc": "2.21.0",
  "eslint-plugin-perfectionist": "4.15.1",
  "globals": "16.4.0",
  "husky": "9.1.7",
  "knip": "5.66.4",
  "lint-staged": "16.2.6",
  "markdownlint-cli2": "0.18.1",
  "markdownlint-cli2-formatter-pretty": "0.0.8",
  "npm-run-all2": "8.0.4",
  "prettier": "3.6.2",
  "prettier-plugin-jsdoc": "1.5.0",
  "prettier-plugin-pkg": "0.21.2",
  "prettier-plugin-sort-json": "4.1.1",
  "tsx": "4.20.6",
  "typescript": "5.9.3",
  "typescript-eslint": "8.46.2"
}
```

**Step 2: Update scripts section**

Replace the scripts section with:

```json
"scripts": {
  "fix": "run-s -sl fix:*",
  "fix:eslint": "eslint --fix .",
  "fix:pkg": "npm pkg fix",
  "fix:prettier": "prettier --write . && markdownlint-cli2 --fix \"**/*.md\"",
  "lint": "run-p -sl --aggregate-output lint:*",
  "lint:commit": "commitlint",
  "lint:eslint": "eslint .",
  "lint:markdown": "markdownlint-cli2 \"**/*.md\"",
  "lint:prettier": "prettier --check .",
  "lint:spelling": "cspell .",
  "lint:staged": "lint-staged",
  "lint:types": "tsc --noEmit",
  "prepare": "husky",
  "test": "run-s test:runtime test:types",
  "test:runtime": "node --import tsx --test --test-reporter=spec \"test/**/*.test.ts\" \"test/**/*.test.js\"",
  "test:types": "tsc --noEmit",
  "test:watch": "node --import tsx --test --test-reporter=spec --watch \"test/**/*.test.ts\" \"test/**/*.test.js\""
}
```

**Step 3: Update lint-staged configuration**

Replace the lint-staged section with:

```json
"lint-staged": {
  "*.{ts,js,yml,json5}": [
    "eslint --fix",
    "prettier --write",
    "cspell lint --no-must-find-files"
  ],
  "**/!(package-lock).json": [
    "eslint --fix",
    "prettier --write",
    "cspell lint --no-must-find-files"
  ],
  "*.md": [
    "markdownlint-cli2 --fix",
    "prettier --write",
    "cspell lint --no-must-find-files"
  ]
}
```

**Step 4: Update prettier configuration**

Replace the prettier section with:

```json
"prettier": {
  "jsdocCommentLineStrategy": "keep",
  "jsdocPreferCodeFences": true,
  "plugins": [
    "prettier-plugin-jsdoc",
    "prettier-plugin-pkg",
    "prettier-plugin-sort-json"
  ],
  "singleQuote": true,
  "tsdoc": true
}
```

**Step 5: Add engines field**

Update the engines field:

```json
"engines": {
  "node": ">=20.0.0"
}
```

**Step 6: Add type field**

Add after the version field:

```json
"type": "module",
```

**Step 7: Verify package.json is valid**

Run: `npm pkg fix`
Expected: Should complete without errors

**Step 8: Commit**

```bash
git add package.json
git commit -m "chore: update dependencies and scripts for modern tooling"
```

---

## Task 8: Update Husky Hooks

**Files:**

- Modify: `/Users/boneskull/projects/boneskull/boneskull-template/.husky/pre-commit`
- Create: `/Users/boneskull/projects/boneskull/boneskull-template/.husky/commit-msg`

**Step 1: Update pre-commit hook**

Replace content of `.husky/pre-commit`:

```bash
npm run lint:staged
```

**Step 2: Create commit-msg hook**

Create `.husky/commit-msg`:

```bash
npm run lint:commit -- --edit ${1}
```

**Step 3: Make commit-msg executable**

Run: `chmod +x /Users/boneskull/projects/boneskull/boneskull-template/.husky/commit-msg`

**Step 4: Verify hooks exist**

Run: `ls -la /Users/boneskull/projects/boneskull/boneskull-template/.husky/`
Expected: Should show both pre-commit and commit-msg

**Step 5: Commit**

```bash
git add .husky/pre-commit .husky/commit-msg
git commit -m "chore: update husky hooks for modern workflow"
```

---

## Task 9: Convert Test Files to node:test with bupkis

**Files:**

- Modify: `/Users/boneskull/projects/boneskull/boneskull-template/test/index.spec.js`
- Rename to: `/Users/boneskull/projects/boneskull/boneskull-template/test/index.test.js`

**Step 1: Read current test file**

Run: `cat /Users/boneskull/projects/boneskull/boneskull-template/test/index.spec.js`

**Step 2: Create new test file with node:test and bupkis**

Create `test/index.test.js`:

```javascript
import { describe, it } from 'node:test';
import { expect } from 'bupkis';

describe('placeholder test suite', () => {
  it('should pass a basic assertion', () => {
    expect(true).toBe(true);
  });

  it('should handle equality', () => {
    const result = 1 + 1;
    expect(result).toBe(2);
  });
});
```

**Step 3: Remove old test file**

Run: `rm /Users/boneskull/projects/boneskull/boneskull-template/test/index.spec.js`

**Step 4: Run tests to verify they work**

Run: `npm test`
Expected: Tests should run with node:test runner and pass

**Step 5: Commit**

```bash
git add test/index.spec.js test/index.test.js
git commit -m "refactor: migrate from Mocha/Unexpected to node:test/bupkis"
```

---

## Task 10: Add knip Configuration

**Files:**

- Modify: `/Users/boneskull/projects/boneskull/boneskull-template/package.json`

**Step 1: Add knip configuration to package.json**

Add this section to package.json:

```json
"knip": {
  "ignore": [
    "**/*.d.ts",
    "worktrees/**/*"
  ],
  "tags": [
    "-knipignore"
  ]
}
```

**Step 2: Add knip script**

Add to scripts section:

```json
"lint:knip": "knip",
```

**Step 3: Run knip to verify**

Run: `npm run lint:knip`
Expected: Should complete (may show unused dependencies which is expected)

**Step 4: Commit**

```bash
git add package.json
git commit -m "feat: add knip configuration for dependency checking"
```

---

## Task 11: Install All Dependencies

**Files:**

- Modify: `/Users/boneskull/projects/boneskull/boneskull-template/package-lock.json`

**Step 1: Remove old node_modules and package-lock**

Run: `cd /Users/boneskull/projects/boneskull/boneskull-template && rm -rf node_modules package-lock.json`

**Step 2: Install all dependencies**

Run: `cd /Users/boneskull/projects/boneskull/boneskull-template && npm install`
Expected: Should complete successfully

**Step 3: Verify installation**

Run: `npm list --depth=0`
Expected: Should show all installed packages

**Step 4: Commit**

```bash
git add package-lock.json
git commit -m "chore: install updated dependencies"
```

---

## Task 12: Run All Linters and Tests

**Files:**

- N/A (verification only)

**Step 1: Run linters**

Run: `cd /Users/boneskull/projects/boneskull/boneskull-template && npm run lint`
Expected: All linters should pass (or show only expected warnings)

**Step 2: Run tests**

Run: `cd /Users/boneskull/projects/boneskull/boneskull-template && npm test`
Expected: All tests should pass

**Step 3: Run formatter check**

Run: `cd /Users/boneskull/projects/boneskull/boneskull-template && npm run lint:prettier`
Expected: Should pass or show only expected formatting issues

**Step 4: Apply fixes if needed**

Run: `cd /Users/boneskull/projects/boneskull/boneskull-template && npm run fix`
Expected: Should auto-fix any formatting issues

**Step 5: Commit any auto-fixes**

```bash
git add -A
git commit -m "style: apply automated formatting fixes"
```

---

## Task 13: Update README with New Tooling

**Files:**

- Modify: `/Users/boneskull/projects/boneskull/boneskull-template/README.md`

**Step 1: Add tooling section to README**

Add this section to the README:

````markdown
## Tooling

This template includes:

- **ESLint v9+** with flat config and TypeScript support
- **Prettier** with automatic formatting
- **TypeScript** with strict checking
- **node:test** - Built-in Node.js test runner
- **bupkis** - Modern assertion library
- **Husky** - Git hooks for quality checks
- **lint-staged** - Run linters on staged files
- **commitlint** - Conventional commit enforcement
- **cspell** - Spell checking
- **markdownlint** - Markdown linting
- **knip** - Find unused dependencies
- **Renovate** - Automated dependency updates

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run linters
npm run lint

# Auto-fix issues
npm run fix

# Watch mode for tests
npm run test:watch
```
````

````

**Step 2: Verify README is updated**

Run: `cat /Users/boneskull/projects/boneskull/boneskull-template/README.md`
Expected: Should include the new tooling section

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README with modern tooling information"
````

---

## Task 14: Final Verification

**Files:**

- N/A (verification only)

**Step 1: Run full test suite**

Run: `cd /Users/boneskull/projects/boneskull/boneskull-template && npm test`
Expected: All tests pass

**Step 2: Run all linters**

Run: `cd /Users/boneskull/projects/boneskull/boneskull-template && npm run lint`
Expected: All linters pass

**Step 3: Verify git status is clean**

Run: `cd /Users/boneskull/projects/boneskull/boneskull-template && git status`
Expected: Should show clean working tree or only expected uncommitted changes

**Step 4: Create summary commit if needed**

```bash
git add -A
git commit -m "chore: complete template modernization"
```

**Step 5: Show git log**

Run: `git log --oneline -n 15`
Expected: Should show all commits from this migration

---

## Notes

**Key Changes:**

- License changed from Apache-2.0 to BlueOak-1.0.0
- ESLint upgraded from v8 (legacy config) to v9+ (flat config)
- Testing migrated from Mocha to node:test
- Assertions migrated from Unexpected to bupkis
- TypeScript config aligned with modestbench standards
- Renovate config moved to .github/renovate.json5
- Added modern tooling: knip, cspell, commitlint
- Updated all dependencies to latest versions
- Added comprehensive npm scripts for development workflow

**Testing Strategy:**

- node:test provides built-in test runner (no external framework needed)
- bupkis provides modern, extensible assertions
- Test files use `.test.js` or `.test.ts` extension
- Watch mode available via `npm run test:watch`

**Linting Strategy:**

- ESLint with TypeScript support via typescript-eslint
- Perfectionist plugin for automatic sorting
- Stylistic plugin for code style rules
- JSON/JSON5 linting included
- Markdown linting with markdownlint-cli2

**Git Workflow:**

- Husky manages git hooks
- pre-commit runs lint-staged for fast checks
- commit-msg validates conventional commits
- All auto-fixable issues corrected on commit
