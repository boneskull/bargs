# Changelog

## [3.0.0](https://github.com/boneskull/bargs/compare/bargs-v2.0.0...bargs-v3.0.0) (2026-01-06)


### ⚠ BREAKING CHANGES

* none, additive only
* The `pipe()` function has been removed from the public API.
* Complete API redesign

### Features

* add merge() combinator for combining parsers ([7c2c1ca](https://github.com/boneskull/bargs/commit/7c2c1cabbbc1b054b73f52a57482e826f19e004d))
* redesign API with fluent builder and combinator-style composition ([d3688c8](https://github.com/boneskull/bargs/commit/d3688c80b76139201d14e64382a0b2af44b86046))


### Code Refactoring

* remove pipe() function ([8ba0a55](https://github.com/boneskull/bargs/commit/8ba0a55fddfb992b5f11b93776829d6c9fbcb5f6))

## [2.0.0](https://github.com/boneskull/bargs/compare/bargs-v1.0.0...bargs-v2.0.0) (2026-01-04)


### ⚠ BREAKING CHANGES

* **types:** transforms must appear before handler in config object for TypeScript to infer transformed types in handler parameters

### Features

* **types:** add TGlobalTransforms type parameter to CommandConfig ([f91683a](https://github.com/boneskull/bargs/commit/f91683abd36ab0c4eef49f8a47e4ea770d555263))


### Bug Fixes

* type inference issues; inference no longer reliant on property ordering ([43cb4fb](https://github.com/boneskull/bargs/commit/43cb4fb4686253cf99d43e866823ff2cdf14b381))
* **types:** improve type inference for transforms and command handlers ([4516aa6](https://github.com/boneskull/bargs/commit/4516aa6e5878770d362e5e90cdca1483b4186f0d))

## [1.0.0](https://github.com/boneskull/bargs/compare/bargs-v0.1.1...bargs-v1.0.0) (2026-01-02)


### ⚠ BREAKING CHANGES

* **types:** Handler arrays are no longer supported. Use transforms for middleware-like sequential processing instead.

### Features

* **bargs:** execute transforms before handlers ([06afa07](https://github.com/boneskull/bargs/commit/06afa07ea9f879393cc62b707aca1249e2a9ba62))
* **opt:** add transforms support to command builder ([3d0f683](https://github.com/boneskull/bargs/commit/3d0f6832c32935d7df26c5f1bb50978a8fb2b45c))
* **parser:** apply transforms in command parsing ([cd2dcda](https://github.com/boneskull/bargs/commit/cd2dcda3ecad6b43203076b448c3eb2916add276))
* **parser:** implement transform runner functions ([f9d143a](https://github.com/boneskull/bargs/commit/f9d143aaff0f046127730618980338fbe4374c13))
* **types:** add transform type definitions ([da7fcb2](https://github.com/boneskull/bargs/commit/da7fcb2f0900500d370487df36ca96b23111f2be))
* **types:** add transforms support to BargsConfig ([d099aac](https://github.com/boneskull/bargs/commit/d099aac07639692e271c786f20732cd84ac5ec2a))
* **types:** add transforms support to CommandConfig ([843c6bf](https://github.com/boneskull/bargs/commit/843c6bfcda7a08b4adcc9e4b5f42579589bd0c2b))


### Code Refactoring

* **types:** remove handler array support in favor of transforms ([2b3a6bd](https://github.com/boneskull/bargs/commit/2b3a6bd60b0e661ef140d701418ed6caee1e422f))

## [0.1.1](https://github.com/boneskull/bargs/compare/bargs-v0.1.0...bargs-v0.1.1) (2025-12-31)


### Bug Fixes

* rename package to @boneskull/bargs ([3333794](https://github.com/boneskull/bargs/commit/333379426efa4d9c80fe8275cb8c1bf434468d7a))

## 0.1.0 (2025-12-31)


### Features

* add ANSI color utilities ([2461dd0](https://github.com/boneskull/bargs/commit/2461dd08c30d5160d5ac071b0f1eb57fe9af299d))
* add automatic version detection from package.json ([095e3b9](https://github.com/boneskull/bargs/commit/095e3b95bb3a5b62c18810c23cdf6ee80f8174e5))
* add command parsing support ([de8d15c](https://github.com/boneskull/bargs/commit/de8d15cb933d2c3f89117a372af6d4721445b1a2))
* add core parser for simple CLI ([8539504](https://github.com/boneskull/bargs/commit/85395048c221044b62c12cd7915338afea47f647))
* add core type definitions ([7e869e6](https://github.com/boneskull/bargs/commit/7e869e65adf677797810870fde9775e87bf2b6cd))
* add enum validation and array option support ([4a5f7d8](https://github.com/boneskull/bargs/commit/4a5f7d8d883dca79cc7550870f7d4e63d5cf76df))
* add enumPos helper, sync/async API, and positional validations ([dbbb0d2](https://github.com/boneskull/bargs/commit/dbbb0d246fda03efc777f5572a5bb19c7ec818af))
* add epilog option with terminal hyperlink support ([ea876aa](https://github.com/boneskull/bargs/commit/ea876aad479a0168ed7e49f37f1137cb236a0449))
* add error formatting with colorful output ([30abaa1](https://github.com/boneskull/bargs/commit/30abaa144b3a40e2acaf6d9667e79d2fd2501049))
* add help generator without Zod introspection ([0ce72c8](https://github.com/boneskull/bargs/commit/0ce72c8e48c52d2082cff17693912dd5b7632118))
* add help text generation with grouping and colors ([f430cc4](https://github.com/boneskull/bargs/commit/f430cc4a94f9090009dcef6428366b4f91f68071))
* add main bargs() entry point with help and version support ([2a8647c](https://github.com/boneskull/bargs/commit/2a8647c9cafa50a2d0b8bf9d594f5a5051f3e516))
* add main bargs() entry point without Zod ([4bf84ad](https://github.com/boneskull/bargs/commit/4bf84ad224f997b23519953e0e26482f45a8d347))
* add named positionals for help text display ([7068779](https://github.com/boneskull/bargs/commit/7068779a890c6908399022bd48ddf4d123b474de))
* add namespaced opt builder with composition ([ffa628d](https://github.com/boneskull/bargs/commit/ffa628d1062d648e232771b8ab28486b9980171a))
* add new parseSimple without Zod ([e68907e](https://github.com/boneskull/bargs/commit/e68907e9bc55217cc71d8b48d72a2806f4e266dc))
* add new Zod-free type definitions ([25ecf8f](https://github.com/boneskull/bargs/commit/25ecf8f3abe1dae9860563a40ea69858da991018))
* add opt.positionals() for positional schema composition ([ce5f5f8](https://github.com/boneskull/bargs/commit/ce5f5f8f303d370f69fed87ea9d691ebfa724051))
* add parseCommands for command-based CLIs ([f551c85](https://github.com/boneskull/bargs/commit/f551c85146d88c5fb1eb613c715ebcd43edc25c3))
* add schema introspection for parseArgs config extraction ([8d5b7e7](https://github.com/boneskull/bargs/commit/8d5b7e7d1bd55a42b41e5086b50d48678edfc286))
* **bargs:** add options parameter to sync bargs function ([1644fd3](https://github.com/boneskull/bargs/commit/1644fd37fef7a1f5ee21a885050933e80f16c6b4))
* **bargs:** add second parameter for runtime options ([53f2ddf](https://github.com/boneskull/bargs/commit/53f2ddffe9f1bd98281c77990490d7f8fcaffc13))
* **exports:** add theme utilities to public API ([f6cf728](https://github.com/boneskull/bargs/commit/f6cf72892d39d2fc4e2ba43ca2f1accc25ae22ce))
* **help:** add positional argument display with theming ([2711376](https://github.com/boneskull/bargs/commit/2711376bf4b9e09983000c5f17be3d06db0e2512))
* **help:** add theme support to help generators ([21d024c](https://github.com/boneskull/bargs/commit/21d024cfdc97c057ec9a32c9d149c9c46bc549ba))
* **theme:** add createStyler function ([8926fba](https://github.com/boneskull/bargs/commit/8926fbad329f9f41e2921c08ab6a36bd5142ccd1))
* **theme:** add defaultText and make Theme properties optional ([191bee2](https://github.com/boneskull/bargs/commit/191bee249f43d42084208bfb197fd11342466496))
* **theme:** add theme types and built-in themes ([b6044bb](https://github.com/boneskull/bargs/commit/b6044bb6811044a77c40935298d485e499a9a2d3))
* **types:** add BargsOptions type for runtime options ([ec6dfad](https://github.com/boneskull/bargs/commit/ec6dfadeb2d97b4f2e276e8d04f4c207ed11558c))


### Bug Fixes

* **help:** fix named positionals in POSITIONALS section ([5fe6b26](https://github.com/boneskull/bargs/commit/5fe6b266c225f6fca8030972b7112d99031f1cac))
* resolve ESLint and linting errors ([96fd12f](https://github.com/boneskull/bargs/commit/96fd12f31e7517739a4b00ea94eb83d11b24733a))
* resolve test failures from environment and removed exports ([8f4a5ce](https://github.com/boneskull/bargs/commit/8f4a5ce8ab6d8e5757d714b730d4becd1d2a06cc))
* use bargsAsync for theme option tests after sync/async split ([c9b38c3](https://github.com/boneskull/bargs/commit/c9b38c3681f64fc7c3bc0c35eecedb3d501f1064))
