# [5.0.0](https://github.com/duydpdev/style-generator/compare/v4.2.0...v5.0.0) (2026-10-31)

### Release

- 5.0 breaking renames ([73d17e5](https://github.com/duydpdev/style-generator/commit/73d17e55fb04311d8f22e5b579c1085840832090))

### Features

- apply generic token types and strict mapping ([091e800](https://github.com/duydpdev/style-generator/commit/091e8003187d5fe534020414cd85a2c5f92daec2))

  Register IDs: V3-01, V3-02, V3-03, V3-04, V3-05, V3-06, V3-07.
  Migration notes: documents/migration/4.x-to-5.0.md ("Types").

  - generate()/createDesignTokens() take the options as a const generic;
    DesignTokens.Web breakpoints, spacingProperties and screens are literal
    readonly arrays derived from them. Without options the library defaults
    apply; an annotated or explicitly typed call falls back to string.
  - An optional-declared borderRadius/borderWidth is typed string (was the
    default keys); absent keeps the defaults.
  - createVariantMapper({ states }) returns literal chained classes; the
    prefix is constrained to the registry prefixes (and "") with an
    allowUnregisteredPrefix opt-out; VariantMapperStatesOptions is removed.
  - ThemeAxisName / ThemeAxisVariant / ThemeAxesState types, aliasedColors
    token array (same set as coverage.keys "aliased"), toKebabCase exported
    from "." and "./cva", more types exported from "./types".
  - parseTheme() is the single ThemeSchema.parse cast.
  - smoke-dist compares each subpath's runtime exports with its built .d.ts;
    dist-types.assert.ts asserts the consumer-facing literals on dist.

  Also commits the phase 08 journal entry.

- examples/design-system and thinned apps ([8058993](https://github.com/duydpdev/style-generator/commit/805899307adf00c0515afedcb0d3e8a37432fada))

  Register IDs: V6-01, V6-02, V6-03, V6-04, V6-05, DOC-10, CI-06 (examples).
  Migration notes: documents/migration/4.x-to-5.0.md.

  - New private workspace examples/design-system: expanded theme.json
    (primaryHover/primaryActive, $alias keys, fontFamily, borderWidth,
    theme.highContrast), one dependency-free style-gen.options.ts
    (`as const satisfies StyleGeneratorOptions`, shared by the three apps
    and by createDesignTokens), tokens, cn (tailwind-merge extension from
    ./recipes), axisAttributes, eight headless cva recipes (button, input,
    card, badge, stack, dialog, text, box) and the shared CSS. A
    style-gen.config.json mirror drives the CLI-only flow.
  - DX tests: a TypeScript Compiler API test renames `danger` in
    theme.json in memory and expects recipe diagnostics; a type test pins
    the intent/breakpoint/axis types; the config mirror is pinned equal to
    `options`.
  - react-v4, next-v4 and nuxt-v4 keep only wiring plus one
    framework-specific component each (react keeps sections/ for the site
    demo). examples-dedup.test.ts asserts no byte-identical file spans two
    apps.
  - Next 16.4 (clears the critical advisory on 15.5.27) and Nuxt 4.4.8
    (`~4.4.8`: Nuxt >= 4.5 needs Vite 8, blocked by the root vite
    resolution) with the Nuxt 4 app/ layout; vue 3.5.44, vue-tsc 3.
  - CI-06: examples are linted (narrow ignores), root vitest excludes
    examples/**, ci.yml runs the design-system test, deploy.yml runs
    check:types-pack. Site example explorer lists the design system.
  - Docs: guide walkthrough "Build components", README, examples README,
    architecture, testing, deploy, migration (failing CLI invocations,
    config read once), CLAUDE.md publishing guards.

- export recipes subpath with tailwind-merge and React helpers ([a4e7b0c](https://github.com/duydpdev/style-generator/commit/a4e7b0cac4ea1bb4717f2ec2b1b9eb467560868c))

  Register IDs: V4-01, V4-02, V4-03, V4-04, V4-05.
  Migration notes: documents/migration/4.x-to-5.0.md ("New in 5.0").

  - New browser-safe subpath ./recipes: createTailwindMergeExtension
    (structural extension for tailwind-merge v3 built from the emitted
    tokens: border-w* / shadow / backdrop-blur groups, sg-typography with its
    conflicts, theme.radius for every rounded-* prefix), splitSpacingProps
    (typed split of spacing props from component props) and
    themeAxisAttributes (typed data-* attributes for the active theme axes).
    Nothing is imported from tailwind-merge in src; recipes are not
    re-exported from the root.
  - New option axes { attribute, scope }: attribute is an axis -> attribute
    name map (also settable from style-gen.config.json), scope "element"
    drops the html anchor and rejects stale alias holders at validation time;
    unknown or duplicate attribute axes are rejected for every scope.
    generateThemeCss takes the options as an optional second argument;
    generate() now validates options before the theme.
  - resolveSpacing accepts any string prop name (SpacingKey | string & {}).
  - vite.config manualChunks pins helpers/colorStates, spacing/spacingHelpers
    and defaultOption to stable chunks so a new entry cannot split ./tokens
    and ./cva; check-sizes budgets: recipes 2284 added; index/vite/next/cli
    raised for the measured axes growth.
  - Real-Tailwind compile and Playwright cases prove scope "element" on a
    nested element.

- runner, config loader, and CLI commands ([d3e6359](https://github.com/duydpdev/style-generator/commit/d3e635988bd80f69b061cbbae0b0ae4a6b18f5b0))

  Register IDs: V5-01, V5-02, V5-03, V5-04, V5-05, V5-06, V5-07, V5-08,
  V5-09, V5-10, V5-11, Q7 (no-op: phase-05 peer matrix is green for vite
  5/6/8; typescript 7 is not in the peer range).
  Migration notes: documents/migration/4.x-to-5.0.md.

  - generate(), generateThemeCss() and the new Node runner share one
    prepareGenerate(); generateFromParsed() assembles the CSS only.
    src/node/{themeEmitter,watchThemeFile,loadStyleGenConfig,
    resolveProjectPath,resolvePluginTarget} are used by the Vite plugin,
    the Next integration and the CLI (never by browser-safe subpaths).
  - Vite plugin: emits in buildStart (also per environment in dev), watches
    the theme, no closeBundle, works without arguments. Next integration:
    function-form config and ctx pass-through, no-argument form, one
    watcher per target+options. resolveProjectPath replaces resolveSafePath
    (no leading-slash rewrite; the theme may live outside the root).
  - CLI: command registry (runCli) with strict per-command flags and --help,
    no process.exit inside commands, generate --watch reloads
    style-gen.config.json and keeps the last valid config; new `tokens`
    (keys-only manifest) and `budget` commands replace
    scripts/check-css-budget.mjs; doctor validates theme x options and
    hints redundant override values as $aliases.
  - resetTailwindDefaults option (colors, radius, shadow) with cross-field
    checks; the variant name `base` is reserved (breaking).
  - dist/*.d.cts for the 8 subpaths, nested require conditions,
    `yarn check:types-pack` (attw, node16) in CI. The .d.cts is its .d.ts
    with the `vite` import rewritten to a type-only import with
    resolution-mode import (scripts/cjs-declaration.mjs; `assert`, since
    `with` does not parse on TypeScript < 5.3). `yarn typecheck:dist` also
    checks the .d.cts as a CommonJS consumer (module node16,
    skipLibCheck false). tsdown strips JSDoc from the CLI bundle
    (37.7 kB -> 22.5 kB gzip).
  - vite-dev-smoke scenario 1 (createServer without listen) runs on Vite
    >= 6 only: Vite 5 has no lazy buildStart.


### Bug Fixes

- review findings for phases 01-12 ([7b44f02](https://github.com/duydpdev/style-generator/commit/7b44f02468ba097daf56da40716ca2c882947174))

  Verified by a five-reviewer pass over v4.0.3..release/5.0 and triaged by
  the advisor. Contract-visible changes land before 5.0.0 stable.

  Schema (themeSchema, crossFieldChecks, aliasGraph)
  - reject alias cycles that only exist when two axes are active together
    (base + one variant per axis, last declared axis wins)
  - reject fontFamily keys `weight*`/`size*` (they overwrite Tailwind's
    font-weight and font-size scales)
  - reject typography keys equal to another category's generated class
    (`textPrimary` next to a `primary` color)
  - reject variants of one axis that kebab-case to the same selector

  Types
  - keep numeric keys (`{ 2: "2px" }`, `{ 500: "$primary" }`) in inferred
    token types; they were dropped and diverged from the runtime
  - type borderProperties/roundedProperties for createVariantMapper
  - reject top-level option typos in generate, createDesignTokens and
    defineOptions (`ExactOptions`)
  - keep non-spacing props when options are annotated StyleGeneratorOptions
  - `coverage` types match the runtime schema (typography keys, non-empty
    prefixes)

  Node
  - Vite duplicate-instance warning is owner-keyed: no false warning on a
    dev-server restart or in builder mode, and real duplicates stay caught
  - validate plugin object options strictly with a labelled error
  - `style-gen tokens --out` accepts only .ts/.mts/.cts and skips identical
    writes

  Gates and packaging
  - deploy.yml runs typecheck:dist before publishing
  - check-browser-safe forbids Node-only runtime dependencies
  - check-externals fails on any inlined node_modules source
  - tailwindcss peer range is ^4.1.0
  - budgets raised to measured + ~10% for index (13560) and vite (15430)

  Examples and docs
  - design-system button has a visible focus ring; react/next examples
    derive axis attributes from themeAxisAttributes
  - migration guide, README and architecture export lists match the code

# [4.2.0](https://github.com/duydpdev/style-generator/compare/v4.1.2...v4.2.0) (2026-10-07)

### Features

- descriptor as source of truth ([9bfbaa4](https://github.com/duydpdev/style-generator/commit/9bfbaa49787fb2d59ecc71ed02980957a7a51a96))

  The built-in category descriptor now drives the token types, the CSS
  mapping and the typed-token arrays; options are resolved once
  (resolveOptions/resolveTokenOptions); themeSchema is split into
  tokenGrammar, aliasGraph and crossFieldChecks. Generated CSS is
  unchanged for existing themes (except the breakpoint-sort fix below); no
  public export is removed.

  New: StyleGeneratorOptions.coverage trims the registry's @source inline
  lines per category (false, prefixes, keys: "aliased"), plus the
  CategoryKey, CategoryTokenKey and CoverageRule types.

  Behaviour notes:
  - borderWidth: {} / borderRadius: {} now count as omitted: tokens and
    types list the default keys (was [] / never[]), matching @source inline.
  - Breakpoints sort by real width (parseFloat): fractional screens such
    as 48.5rem vs 48rem now order correctly; CSS can change for such input.
  - An override-scoped collision is reported once, at the base path.
  - coverage.keys "aliased" keeps the alias holders (keys whose value is
    a $alias, base or any themeAxes override); their targets need no class.
  - ./tokens is built with preserveEntrySignatures "allow-extension" and
    minifyInternalExports: its runtime exports may list one-letter internal
    aliases; dist/tokens.d.ts is the contract. Size budgets re-measured.
  - Release notes now print [feat] commit bodies too (release.config.cjs).

# [4.1.2](https://github.com/duydpdev/style-generator/compare/v4.1.1...v4.1.2) (2026-10-06)

### Bug Fixes

- config: update peer matrix to reflect tested support ([aa54000](https://github.com/duydpdev/style-generator/commit/aa54000fd72e4a925013ad2eaf2117722aa89c89))

  Peer ranges now follow the CI peer-matrix job (latest release of each
  major: example build, Vite dev server, example and dist .d.ts typecheck).
  vite: ^5 || ^6 || ^7 || ^8 (Vite 8 is now accepted).
  typescript: ^5 || ^6 (TypeScript 6 is now accepted).
  TypeScript 7 (native port) is not supported yet. Nothing is narrowed;
  no migration needed.

# [4.1.1](https://github.com/duydpdev/style-generator/compare/v4.1.0...v4.1.1) (2026-10-06)

### Bug Fixes

- CLI scaffolding guards, Vite/Next integration phases and Node engines ([7178721](https://github.com/duydpdev/style-generator/commit/71787213cabe3333bf3c9cee97775235d6782180))

# [4.1.0](https://github.com/duydpdev/style-generator/compare/v4.0.3...v4.1.0) (2026-10-06)

### Features

- validate options, config and cross-category theme variables ([afd2d30](https://github.com/duydpdev/style-generator/commit/afd2d3023407de07ac5a58fd527c78d88e6a15be))

# [4.0.3](https://github.com/duydpdev/style-generator/compare/v4.0.2...v4.0.3) (2026-10-05)

### Bug Fixes

- make init scaffold one working setup and doctor check only what it uses ([f0a2d96](https://github.com/duydpdev/style-generator/commit/f0a2d964f4182df2fb3ca26b560c2a5ca76166cd))

# [4.0.2](https://github.com/duydpdev/style-generator/compare/v4.0.1...v4.0.2) (2026-10-05)

### Bug Fixes

- keep schema, options and typed helpers consistent with the emitted CSS ([364615a](https://github.com/duydpdev/style-generator/commit/364615afb5e319aad6d6f9e814aebd8b8eb957fd)) (see [4.0.2 — stricter validation](./documents/migration/3.x-to-4.0.md#402--stricter-validation))

# [4.0.1](https://github.com/duydpdev/style-generator/compare/v4.0.0...v4.0.1) (2026-10-05)

### Bug Fixes

- exit non-zero on failed generate, fix --version and release tag detection ([0f3936c](https://github.com/duydpdev/style-generator/commit/0f3936c3a901e15efa14f32eca9364a8824639ea))

# [4.0.0](https://github.com/duydpdev/style-generator/compare/v3.0.0...v4.0.0) (2026-09-30)

### Bug Fixes

- align default breakpoints and kebab types, warn on Tailwind utility collisions ([aed6bad](https://github.com/duydpdev/style-generator/commit/aed6badb57d5c8cf3250ee2ea960b7198c2c3631))
- correct --sg-sp-* custom-property inheritance in spacing utilities ([6a96706](https://github.com/duydpdev/style-generator/commit/6a9670678157fd95e62a7390ffed58aaf7bfed90))
- print key-grammar hint for invalid record keys ([67515d1](https://github.com/duydpdev/style-generator/commit/67515d1df7665dbff12a989ca0c4a9f84baf0c3a))
- reject underscores in token keys, kebab state prefixes, atomic writes ([8a635ec](https://github.com/duydpdev/style-generator/commit/8a635ec09e045f5d47a16c48293605b8129e4670))
- skip comments in CSS block extractor and regenerate baseline class list ([317b1a5](https://github.com/duydpdev/style-generator/commit/317b1a59136e8a50e2ffb426d45f6d6a7b6036d0))
- skip undefined optional typography fields in generated CSS ([0528bc6](https://github.com/duydpdev/style-generator/commit/0528bc6802d0315db6f893a16cd9abc1e69a5cd9))
- tighten alias/override validation and make cva round-trip probative ([17ea1ab](https://github.com/duydpdev/style-generator/commit/17ea1ab4cc965ff360418054a5ac6f553f37c5a5))
- unify tailwind engine, align state source lines with tokens, guard axis key order ([76a6b30](https://github.com/duydpdev/style-generator/commit/76a6b301c8ffcd77871085a59cc0b2bf2fff8025))

### Code Refactoring

- enable strict TypeScript flags repo-wide, remove unsafe casts ([dcda75b](https://github.com/duydpdev/style-generator/commit/dcda75bc9a6885b0259191db87b24782a5c61cf3))

### Features

- add $schema to example themes + committed theme.schema.json + AC6 proof ([3b4e3b0](https://github.com/duydpdev/style-generator/commit/3b4e3b06f00d65aad1797d47a8c8485f0248d777))
- add next-v4 and nuxt-v4 examples ([#68](https://github.com/duydpdev/style-generator-private/issues/68)) ([60976d7](https://github.com/duydpdev/style-generator/commit/60976d760b58f50f5fb4de8b5333876c5eb1b4a4))
- add strict Zod 4 theme schema as single source of truth ([01db4ed](https://github.com/duydpdev/style-generator/commit/01db4ed0de5f9d9223b03274efe7113b755403c5))
- add strict Zod theme schema ([3105af0](https://github.com/duydpdev/style-generator/commit/3105af03e7a7b657d838982829284c350595245d))
- add style-gen generate command ([adf9b79](https://github.com/duydpdev/style-generator/commit/adf9b79897721355c448e7c0ae4156fded6fdfa0))
- add token aliases, fontFamily/borderWidth, registry `@source` inline, styleGenNext and flat variant mapper ([898831e](https://github.com/duydpdev/style-generator/commit/898831ec49d33282c1e7d91ea56d186158943d7d))
- add token category registry and generate() core ([440a958](https://github.com/duydpdev/style-generator/commit/440a958643fa1ddd846e1b359e051e91221bafe5))
- alias tokens, fontFamily/borderWidth categories, `@source` inline ([cc68e52](https://github.com/duydpdev/style-generator/commit/cc68e527cd1379a5152abbb611181f990addf82e))
- multi-axis themeAxes and registry-driven state palette classes ([89d49f2](https://github.com/duydpdev/style-generator/commit/89d49f2cb05ebd612a64a0cc176eb7f1917dd0cf))
- update lib v4 ([#66](https://github.com/duydpdev/style-generator-private/issues/66)) ([9e78d18](https://github.com/duydpdev/style-generator/commit/9e78d185c702a12a7b5f9b67416da05e871a07cd))
- validate always via ThemeSchema in generate/CLI/Vite + schema command ([a2971a0](https://github.com/duydpdev/style-generator/commit/a2971a0b2b452b2060591188de27ec5fd1b41ec6))

### Performance Improvements

- lock CSS output size budget and class-family coverage checks ([fd1bc08](https://github.com/duydpdev/style-generator/commit/fd1bc08d3f923402bbcd12c63cccd1f2112060d7))

### release

- introduce token category registry and generate() core ([acb90af](https://github.com/duydpdev/style-generator/commit/acb90afd38c94684c5b78da11041b287d02ff95e))
- promote 4.0.0 to main ([41a5343](https://github.com/duydpdev/style-generator/commit/41a53437f3856ccd5897b465a98a8db3a5e7933f))

### BREAKING CHANGES

- 4.0.0 drops Tailwind v3 and the JS plugin API in
favour of generate() + generated CSS with @source inline, a strict Zod
theme schema, themeAxes, strict spacing types and the new
createVariantMapper; see documents/migration/3.x-to-4.0.md.
- ThemeConfig.themes is replaced by themeAxes
(Record<axisName, Record<variantName, ThemeOverride>>); a theme that
still uses `themes` is rejected with a rename hint. Axis override
blocks are emitted after :root, in config declaration order, and are
scoped to `html[data-<axis>="<value>"]`. createVariantMapper accepts
`{ states }` and returns state classes (e.g. hover:bg-primary-hover)
for flat sibling tokens, so components no longer hand-author them.
Cross-axis compound overrides stay hand-written CSS.
- generateSafelist(), the CLI `safelist` command and
the options safelistColors, layout, border, rounded, opacity, zIndex,
dynamicClasses, responsiveModules and modules are removed; runtime-built
classes go through the new `extraSources` option. Utility coverage is
provided by registry-generated `@source inline(...)` directives inside
the generated CSS, so safelist.txt is gone. createVariantMapper() drops
isKeepFormat and always kebab-cases like the registry. The CLI gains
`style-gen generate [--watch]`, and a new `./next` subpath
(styleGenNext) writes the generated CSS for Next.js. The theme key
`border` is renamed to `borderWidth`.
- noUncheckedIndexedAccess and exactOptionalPropertyTypes
are enabled at the root tsconfig with no module overrides. The loose
ResponsiveValue type (which accepted arbitrary breakpoint keys) is
removed; ResponsiveValueStrict is the sole responsive-value type.
resolveSpacing/resolveSpacingProps now accept only SpacingKey props,
and resolveSpacingProps() returns `classNames: string` (already joined)
instead of `classNames: string[]`.
- ThemeConfig is now inferred from a strict Zod schema.
Unknown keys and CSS-injection characters in token keys/values are
rejected. defineTheme() now validates at runtime, returns the parsed
theme, and is exported only from the root entry (removed from
`./tokens`, which stays browser-safe). generate(), the CLI and the
Vite plugin always validate the theme. A new `style-gen schema`
command generates theme.schema.json for editor autocomplete.
- spacing CSS variables move from --tw-sp-* (which
squatted Tailwind's internal --tw- namespace and leaked parent
breakpoint values to children via unregistered custom-property
inheritance) and the inline --sp-* variables to --sg-sp-*, with an
explicit `@property syntax:"*" inherits:false` declaration per
property/breakpoint. The global `*` rule is removed; fallback chains
now live inside each @utility sp-*. Consumers reading --tw-sp-* or
--sp-* directly must switch to --sg-sp-*.
- removes createStylePlugin, detectTailwindVersion,
the tailwindVersion option, spacing.useMatchUtilities, and the
`./plugin` subpath export. Tailwind v3 support is dropped and the
tailwindcss peer floor is now >=4.1.0. createStyleSystem() is replaced
by generate(), which returns a single generated CSS string instead of a
JS plugin object; styleGenVite now writes generate().css to theme.css.
Consumers must replace `@plugin "...theme-plugin"` with a plain CSS
`@import` of the generated file (full guide: documents/migration/3.x-to-4.0.md).

# 4.0.0-DEV.1 (2026-09-29)

### Bug Fixes

- align default breakpoints and kebab types, warn on Tailwind utility collisions (59b2221)
- correct --sg-sp-* custom-property inheritance in spacing utilities (0e82feb)
- print key-grammar hint for invalid record keys (18debfc)
- reject underscores in token keys, kebab state prefixes, atomic writes (082379c)
- skip comments in CSS block extractor and regenerate baseline class list (4910a8c)
- skip undefined optional typography fields in generated CSS (4e49bf8)
- tighten alias/override validation and make cva round-trip probative (bf9090a)
- unify tailwind engine, align state source lines with tokens, guard axis key order (8024ecd)

### Code Refactoring

- enable strict TypeScript flags repo-wide, remove unsafe casts (8f8a84c)

### Features

- add $schema to example themes + committed theme.schema.json + AC6 proof (cf892e8)
- add strict Zod 4 theme schema as single source of truth (52ba9c1)
- add strict Zod theme schema (3f5cbc2)
- add style-gen generate command (29cd84f)
- add token aliases, fontFamily/borderWidth, registry `@source` inline, styleGenNext and flat variant mapper (97a9952)
- add token category registry and generate() core (9def0f2)
- alias tokens, fontFamily/borderWidth categories, `@source` inline (503ddb8)
- multi-axis themeAxes and registry-driven state palette classes (4c8b70d)
- validate always via ThemeSchema in generate/CLI/Vite + schema command (0954929)

### Performance Improvements

- lock CSS output size budget and class-family coverage checks (ff73c3f)

### release

- introduce token category registry and generate() core (cd664dd)

### BREAKING CHANGES

- ThemeConfig.themes is replaced by themeAxes
(Record<axisName, Record<variantName, ThemeOverride>>); a theme that
still uses `themes` is rejected with a rename hint. Axis override
blocks are emitted after :root, in config declaration order, and are
scoped to `html[data-<axis>="<value>"]`. createVariantMapper accepts
`{ states }` and returns state classes (e.g. hover:bg-primary-hover)
for flat sibling tokens, so components no longer hand-author them.
Cross-axis compound overrides stay hand-written CSS.
- generateSafelist(), the CLI `safelist` command and
the options safelistColors, layout, border, rounded, opacity, zIndex,
dynamicClasses, responsiveModules and modules are removed; runtime-built
classes go through the new `extraSources` option. Utility coverage is
provided by registry-generated `@source inline(...)` directives inside
the generated CSS, so safelist.txt is gone. createVariantMapper() drops
isKeepFormat and always kebab-cases like the registry. The CLI gains
`style-gen generate [--watch]`, and a new `./next` subpath
(styleGenNext) writes the generated CSS for Next.js. The theme key
`border` is renamed to `borderWidth`.
- noUncheckedIndexedAccess and exactOptionalPropertyTypes
are enabled at the root tsconfig with no module overrides. The loose
ResponsiveValue type (which accepted arbitrary breakpoint keys) is
removed; ResponsiveValueStrict is the sole responsive-value type.
resolveSpacing/resolveSpacingProps now accept only SpacingKey props,
and resolveSpacingProps() returns `classNames: string` (already joined)
instead of `classNames: string[]`.
- ThemeConfig is now inferred from a strict Zod schema.
Unknown keys and CSS-injection characters in token keys/values are
rejected. defineTheme() now validates at runtime, returns the parsed
theme, and is exported only from the root entry (removed from
`./tokens`, which stays browser-safe). generate(), the CLI and the
Vite plugin always validate the theme. A new `style-gen schema`
command generates theme.schema.json for editor autocomplete.
- spacing CSS variables move from --tw-sp-* (which
squatted Tailwind's internal --tw- namespace and leaked parent
breakpoint values to children via unregistered custom-property
inheritance) and the inline --sp-* variables to --sg-sp-*, with an
explicit `@property syntax:"*" inherits:false` declaration per
property/breakpoint. The global `*` rule is removed; fallback chains
now live inside each @utility sp-*. Consumers reading --tw-sp-* or
--sp-* directly must switch to --sg-sp-*.
- removes createStylePlugin, detectTailwindVersion,
the tailwindVersion option, spacing.useMatchUtilities, and the
`./plugin` subpath export. Tailwind v3 support is dropped and the
tailwindcss peer floor is now >=4.1.0. createStyleSystem() is replaced
by generate(), which returns a single generated CSS string instead of a
JS plugin object; styleGenVite now writes generate().css to theme.css.
Consumers must replace `@plugin "...theme-plugin"` with a plain CSS
`@import` of the generated file (full guide: documents/migration/3.x-to-4.0.md).

# 3.1.0-DEV.2 (2026-06-07)

### Features

- add next-v4 and nuxt-v4 examples ([#68](https://github.com/duydpdev/style-generator-private/issues/68)) (c69de63)

# 3.1.0-DEV.1 (2026-06-07)

### Features

- update lib v4 ([#66](https://github.com/duydpdev/style-generator-private/issues/66)) (8e25647)

# 3.0.0 (2026-03-30)

### Features

- update lib ([#64](https://github.com/duydpdev/style-generator-private/issues/64)) (a2661d5)

# 2.1.0-DEV.1 (2026-03-30)

### Features

- update lib ([#64](https://github.com/duydpdev/style-generator-private/issues/64)) (a2661d5)

# 2.0.0 (2026-03-30)

### Features

- change publish package to npm ([#62](https://github.com/duydpdev/style-generator-private/issues/62)) (5ce9fad)

# 1.7.0-DEV.1 (2026-03-30)

### Features

- change publish package to npm ([#62](https://github.com/duydpdev/style-generator-private/issues/62)) (5ce9fad)

# 1.6.0 (2026-03-30)

### Bug Fixes

- fix gensafelist border ([#53](https://github.com/duydpdev/style-generator-private/issues/53)) (6a654c0)
- fix interface zindex ([#57](https://github.com/duydpdev/style-generator-private/issues/57)) (8ca4f43)
- fix repsonsive ([#54](https://github.com/duydpdev/style-generator-private/issues/54)) (4e41e8f)
- fix spacing css gen ([#49](https://github.com/duydpdev/style-generator-private/issues/49)) (4ed7916)
- fix tempalte gen plugins ([#55](https://github.com/duydpdev/style-generator-private/issues/55)) (72dead0)
- update logic gen plugin, safelist, design token ([#58](https://github.com/duydpdev/style-generator-private/issues/58)) (0047ebf)

### Features

- add api gen cva function ([#50](https://github.com/duydpdev/style-generator-private/issues/50)) (53770f5)
- upadate lib with new doc tailwind ([#60](https://github.com/duydpdev/style-generator-private/issues/60)) (0031e0f)
- update claude code setting ([#56](https://github.com/duydpdev/style-generator-private/issues/56)) (e9e8c4d)
- update cli ([#48](https://github.com/duydpdev/style-generator-private/issues/48)) (09a1b54)
- update gen design token cammelCase ([#51](https://github.com/duydpdev/style-generator-private/issues/51)) (9c6454e)
- update plan imrovement lib ([#59](https://github.com/duydpdev/style-generator-private/issues/59)) (287b712)
- update type responsiveValue ([#52](https://github.com/duydpdev/style-generator-private/issues/52)) (49d6761)

# 1.6.0-DEV.13 (2026-03-17)

### Features

- upadate lib with new doc tailwind ([#60](https://github.com/duydpdev/style-generator-private/issues/60)) (0031e0f)

# 1.6.0-DEV.12 (2026-03-13)

### Features

- update plan imrovement lib ([#59](https://github.com/duydpdev/style-generator-private/issues/59)) (287b712)

# 1.6.0-DEV.11 (2026-03-13)

### Bug Fixes

- update logic gen plugin, safelist, design token ([#58](https://github.com/duydpdev/style-generator-private/issues/58)) (0047ebf)

# 1.6.0-DEV.10 (2026-03-12)

### Bug Fixes

- fix interface zindex ([#57](https://github.com/duydpdev/style-generator-private/issues/57)) (8ca4f43)

# 1.6.0-DEV.9 (2026-03-12)

### Features

- update claude code setting ([#56](https://github.com/duydpdev/style-generator-private/issues/56)) (e9e8c4d)

# 1.6.0-DEV.8 (2026-03-09)

### Bug Fixes

- fix tempalte gen plugins ([#55](https://github.com/duydpdev/style-generator-private/issues/55)) (72dead0)

# 1.6.0-DEV.7 (2026-03-09)

### Bug Fixes

- fix repsonsive ([#54](https://github.com/duydpdev/style-generator-private/issues/54)) (4e41e8f)

# 1.6.0-DEV.6 (2026-03-08)

### Bug Fixes

- fix gensafelist border ([#53](https://github.com/duydpdev/style-generator-private/issues/53)) (6a654c0)

# 1.6.0-DEV.5 (2026-03-08)

### Features

- update type responsiveValue ([#52](https://github.com/duydpdev/style-generator-private/issues/52)) (49d6761)

# 1.6.0-DEV.4 (2026-03-08)

### Features

- update gen design token cammelCase ([#51](https://github.com/duydpdev/style-generator-private/issues/51)) (9c6454e)

# 1.6.0-DEV.3 (2026-03-08)

### Features

- add api gen cva function ([#50](https://github.com/duydpdev/style-generator-private/issues/50)) (53770f5)

# 1.6.0-DEV.2 (2026-03-08)

### Bug Fixes

- fix spacing css gen ([#49](https://github.com/duydpdev/style-generator-private/issues/49)) (4ed7916)

# 1.6.0-DEV.1 (2026-03-07)

### Features

- update cli ([#48](https://github.com/duydpdev/style-generator-private/issues/48)) (09a1b54)

# 1.5.0 (2026-03-07)

### Bug Fixes

- fix readme docs ([#46](https://github.com/duydpdev/style-generator-private/issues/46)) (58e84c8)

### Features

- Add option to disable color prefixing for CSS variables and introduce new test files for safelist, design tokens, and CSS variables. ([#45](https://github.com/duydpdev/style-generator-private/issues/45)) (27e8c18)

# 1.5.0-DEV.2 (2026-03-07)

### Bug Fixes

- fix readme docs ([#46](https://github.com/duydpdev/style-generator-private/issues/46)) (58e84c8)

# 1.5.0-DEV.1 (2026-03-07)

### Features

- Add option to disable color prefixing for CSS variables and introduce new test files for safelist, design tokens, and CSS variables. ([#45](https://github.com/duydpdev/style-generator-private/issues/45)) (27e8c18)

# 1.4.0 (2026-03-06)

### Features

- update agent & refactore code ([#43](https://github.com/duydpdev/style-generator-private/issues/43)) (2bc3725)

# 1.4.0-DEV.1 (2026-03-06)

### Features

- update agent & refactore code ([#43](https://github.com/duydpdev/style-generator-private/issues/43)) (2bc3725)

# 1.3.0 (2026-03-06)

###

Bug Fixes

- fix cicd 3 ([#33](https://github.com/duydpdev/style-generator-private/issues/33)) (9ff24ea)
- fix cicd 4 ([#34](https://github.com/duydpdev/style-generator-private/issues/34)) (e8374da)
- remove code (cf51a03)
- remove code (e90c0b8)
- update version node for cicd ([#41](https://github.com/duydpdev/style-generator-private/issues/41)) (fe2c3a7)

###

Features

- implement cli for lib phase 1 ([#31](https://github.com/duydpdev/style-generator-private/issues/31)) (88c327a)
- merge develop into main (090961d)

# 1.3.0-DEV.5 (2026-03-06)

###

Bug Fixes

- remove code (cf51a03)
- remove code (e90c0b8)
- update version node for cicd ([#41](https://github.com/duydpdev/style-generator-private/issues/41)) (fe2c3a7)

# 1.3.0-DEV.4 (2026-03-05)

###

Bug Fixes

- fix cicd 4 ([#34](https://github.com/duydpdev/style-generator-private/issues/34)) (e8374da)

# 1.3.0-DEV.3 (2026-03-05)

###

Bug Fixes

- fix cicd 3 ([#33](https://github.com/duydpdev/style-generator-private/issues/33)) (9ff24ea)

# 1.3.0-DEV.2 (2026-03-05)

# 1.3.0-DEV.1 (2026-03-05)

###

Features

- implement cli for lib phase 1 ([#31](https://github.com/duydpdev/style-generator-private/issues/31)) (88c327a)

# 1.2.0 (2026-03-04)

###

Bug Fixes

- apply review feedback: circular imports, docs, types, border wiring ([#13](https://github.com/duydpdev/style-generator-private/issues/13)) (c47a7be)
- CI auto-run for all PRs + squash-merge compatibility ([#23](https://github.com/duydpdev/style-generator-private/issues/23)) (d4e80e9)
- Dedup CHANGELOG, fix Yarn token interpolation, add CI permissions, add wip commitlint type ([#25](https://github.com/duydpdev/style-generator-private/issues/25)) (26bb85d)
- fix cicd ([#28](https://github.com/duydpdev/style-generator-private/issues/28)) (004335c)
- fix cicd 2 (74bbb2d)
- fix conflict ([#19](https://github.com/duydpdev/style-generator-private/issues/19)) (5d5718c)
- fix conflict 1 ([#20](https://github.com/duydpdev/style-generator-private/issues/20)) (83ce268)
- fix conflict 2 ([#21](https://github.com/duydpdev/style-generator-private/issues/21)) (40e1062)
- remove check title PR cicd ([#27](https://github.com/duydpdev/style-generator-private/issues/27)) (eec4eff)

###

Features

- merge develop into main (cc33ced)
- merge develop into main ([#26](https://github.com/duydpdev/style-generator-private/issues/26)) (fe58f86)
- update safe typescript safelist (2631b60)
- update yarnrc ([#17](https://github.com/duydpdev/style-generator-private/issues/17)) (72833a0)

###

Reverts

- Revert "Initial plan ([#14](https://github.com/duydpdev/style-generator-private/issues/14))" ([#15](https://github.com/duydpdev/style-generator-private/issues/15)) (9a986da)

# 1.2.0-DEV.1 (2026-03-04)

###

Bug Fixes

- apply review feedback: circular imports, docs, types, border wiring ([#13](https://github.com/duydpdev/style-generator-private/issues/13)) (c47a7be)
- CI auto-run for all PRs + squash-merge compatibility ([#23](https://github.com/duydpdev/style-generator-private/issues/23)) (d4e80e9)
- Dedup CHANGELOG, fix Yarn token interpolation, add CI permissions, add wip commitlint type ([#25](https://github.com/duydpdev/style-generator-private/issues/25)) (26bb85d)
- fix cicd ([#28](https://github.com/duydpdev/style-generator-private/issues/28)) (004335c)
- fix cicd 2 (74bbb2d)
- fix conflict ([#19](https://github.com/duydpdev/style-generator-private/issues/19)) (5d5718c)
- fix conflict 1 ([#20](https://github.com/duydpdev/style-generator-private/issues/20)) (83ce268)
- fix conflict 2 ([#21](https://github.com/duydpdev/style-generator-private/issues/21)) (40e1062)
- remove check title PR cicd ([#27](https://github.com/duydpdev/style-generator-private/issues/27)) (eec4eff)

###

Features

- merge develop into main ([#26](https://github.com/duydpdev/style-generator-private/issues/26)) (fe58f86)
- update safe typescript safelist (2631b60)
- update yarnrc ([#17](https://github.com/duydpdev/style-generator-private/issues/17)) (72833a0)
- update safelist & token (612e3f0)

###

Reverts

- Revert "Initial plan ([#14](https://github.com/duydpdev/style-generator-private/issues/14))" ([#15](https://github.com/duydpdev/style-generator-private/issues/15)) (9a986da)

# 1.2.0-DEV.6 (2026-03-04)

### Features

- update yarnrc ([#17](https://github.com/duydpdev/style-generator-private/issues/17)) 7f5610e

# 1.2.0-DEV.5 (2026-03-04)

### Reverts

- Revert "Initial plan ([#14](https://github.com/duydpdev/style-generator-private/issues/14))" ([#15](https://github.com/duydpdev/style-generator-private/issues/15)) 039df9e

# 1.2.0-DEV.4 (2026-03-04)

### Bug Fixes

- apply review feedback: circular imports, docs, types, border wiring ([#13](https://github.com/duydpdev/style-generator-private/issues/13)) d1734b8

# 1.2.0-DEV.3 (2026-03-04)

### Bug Fixes

- use addUtilities instead of addBase for responsive @media rules d3733e3

# 1.2.0-DEV.2 (2026-03-04)

### Features

- update safe typescript safelist dd91d4f

# 1.1.0 (2026-03-01)

### Features

- update color theme variable 2ad29f0

# 1.1.0-DEV.1 (2026-03-01)

### Features

- update color theme variable 2ad29f0

# 1.0.0 (2026-02-14)

### Bug Fixes

- update yarn config ([#2](https://github.com/duydpdev/style-generator-private/issues/2)) 1425ccf
- update yarn config ([#3](https://github.com/duydpdev/style-generator-private/issues/3)) 30f1140

### Features

- init project 4ea7557
- update package name & workflow 22de09f
- update package.json 9fc6c7b
- update package.json 2a789e6
- update scripts package.json 03d21ed
- update theme.json example ([#1](https://github.com/duydpdev/style-generator-private/issues/1)) 235cdc5

# 1.0.0-DEV.3 (2026-02-14)

### Bug Fixes

- update yarn config ([#3](https://github.com/duydpdev/style-generator-private/issues/3)) 30f1140

# 1.0.0-DEV.2 (2026-02-14)

### Bug Fixes

- update yarn config ([#2](https://github.com/duydpdev/style-generator-private/issues/2)) 1425ccf

# 1.0.0-DEV.1 (2026-02-14)

### Features

- init project 4ea7557
- update package name & workflow 22de09f
- update package.json 9fc6c7b
- update package.json 2a789e6
- update scripts package.json 03d21ed
- update theme.json example ([#1](https://github.com/duydpdev/style-generator-private/issues/1)) 235cdc5
