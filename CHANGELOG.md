# [4.0.0]() (2026-09-30)

### Bug Fixes

- align default breakpoints and kebab types, warn on Tailwind utility collisions ([59b2221]())
- correct --sg-sp-* custom-property inheritance in spacing utilities ([0e82feb]())
- print key-grammar hint for invalid record keys ([18debfc]())
- reject underscores in token keys, kebab state prefixes, atomic writes ([082379c]())
- skip comments in CSS block extractor and regenerate baseline class list ([4910a8c]())
- skip undefined optional typography fields in generated CSS ([4e49bf8]())
- tighten alias/override validation and make cva round-trip probative ([bf9090a]())
- unify tailwind engine, align state source lines with tokens, guard axis key order ([8024ecd]())

### Code Refactoring

- enable strict TypeScript flags repo-wide, remove unsafe casts ([8f8a84c]())

### Features

- add $schema to example themes + committed theme.schema.json + AC6 proof ([cf892e8]())
- add next-v4 and nuxt-v4 examples ([#68](https://github.com/duydpdev/style-generator-private/issues/68)) ([c69de63]())
- add strict Zod 4 theme schema as single source of truth ([52ba9c1]())
- add strict Zod theme schema ([3f5cbc2]())
- add style-gen generate command ([29cd84f]())
- add token aliases, fontFamily/borderWidth, registry [@source](https://github.com/source) inline, styleGenNext and flat variant mapper ([97a9952]())
- add token category registry and generate() core ([9def0f2]())
- alias tokens, fontFamily/borderWidth categories, [@source](https://github.com/source) inline ([503ddb8]())
- multi-axis themeAxes and registry-driven state palette classes ([4c8b70d]())
- update lib v4 ([#66](https://github.com/duydpdev/style-generator-private/issues/66)) ([8e25647]())
- validate always via ThemeSchema in generate/CLI/Vite + schema command ([0954929]())

### Performance Improvements

- lock CSS output size budget and class-family coverage checks ([ff73c3f]())

### release

- introduce token category registry and generate() core ([cd664dd]())
- promote 4.0.0 to main ([2377c27]())

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
- notes as valid markdown, and drop the orphan
shared/utils.index.ts barrel.
- removes createStylePlugin, detectTailwindVersion,
the tailwindVersion option, spacing.useMatchUtilities, and the
`./plugin` subpath export. Tailwind v3 support is dropped and the
tailwindcss peer floor is now >=4.1.0. createStyleSystem() is replaced
by generate(), which returns a single generated CSS string instead of a
JS plugin object; styleGenVite now writes generate().css to theme.css.
Consumers must replace `@plugin "...theme-plugin"` with a plain CSS
`@import` of the generated file (full guide: docs/migration/3.x-to-4.0.md,
written in the 4.0.0 stable phase).

# [4.0.0-DEV.1]() (2026-09-29)

### Bug Fixes

- align default breakpoints and kebab types, warn on Tailwind utility collisions ([59b2221]())
- correct --sg-sp-* custom-property inheritance in spacing utilities ([0e82feb]())
- print key-grammar hint for invalid record keys ([18debfc]())
- reject underscores in token keys, kebab state prefixes, atomic writes ([082379c]())
- skip comments in CSS block extractor and regenerate baseline class list ([4910a8c]())
- skip undefined optional typography fields in generated CSS ([4e49bf8]())
- tighten alias/override validation and make cva round-trip probative ([bf9090a]())
- unify tailwind engine, align state source lines with tokens, guard axis key order ([8024ecd]())

### Code Refactoring

- enable strict TypeScript flags repo-wide, remove unsafe casts ([8f8a84c]())

### Features

- add $schema to example themes + committed theme.schema.json + AC6 proof ([cf892e8]())
- add strict Zod 4 theme schema as single source of truth ([52ba9c1]())
- add strict Zod theme schema ([3f5cbc2]())
- add style-gen generate command ([29cd84f]())
- add token aliases, fontFamily/borderWidth, registry [@source](https://github.com/source) inline, styleGenNext and flat variant mapper ([97a9952]())
- add token category registry and generate() core ([9def0f2]())
- alias tokens, fontFamily/borderWidth categories, [@source](https://github.com/source) inline ([503ddb8]())
- multi-axis themeAxes and registry-driven state palette classes ([4c8b70d]())
- validate always via ThemeSchema in generate/CLI/Vite + schema command ([0954929]())

### Performance Improvements

- lock CSS output size budget and class-family coverage checks ([ff73c3f]())

### release

- introduce token category registry and generate() core ([cd664dd]())

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
- notes as valid markdown, and drop the orphan
shared/utils.index.ts barrel.
- removes createStylePlugin, detectTailwindVersion,
the tailwindVersion option, spacing.useMatchUtilities, and the
`./plugin` subpath export. Tailwind v3 support is dropped and the
tailwindcss peer floor is now >=4.1.0. createStyleSystem() is replaced
by generate(), which returns a single generated CSS string instead of a
JS plugin object; styleGenVite now writes generate().css to theme.css.
Consumers must replace `@plugin "...theme-plugin"` with a plain CSS
`@import` of the generated file (full guide: docs/migration/3.x-to-4.0.md,
written in the 4.0.0 stable phase).

# [3.1.0-DEV.2]() (2026-06-07)

  ###
  Features

    -
    add next-v4 and nuxt-v4 examples ([#68](https://github.com/duydpdev/style-generator-private/issues/68))
    ([c69de63]())

# [3.1.0-DEV.1]() (2026-06-07)

  ###
  Features

    -
    update lib v4 ([#66](https://github.com/duydpdev/style-generator-private/issues/66))
    ([8e25647]())

# [3.1.0-DEV.1]() (2026-06-07)

  ###
  Features

    -
    update lib v4 ([#66](https://github.com/duydpdev/style-generator-private/issues/66))
    ([8e25647]())

# [3.0.0]() (2026-03-30)

  ###
  Features

    -
    update lib ([#64](https://github.com/duydpdev/style-generator-private/issues/64))
    ([a2661d5]())

# [2.1.0-DEV.1]() (2026-03-30)

  ###
  Features

    -
    update lib ([#64](https://github.com/duydpdev/style-generator-private/issues/64))
    ([a2661d5]())

# [2.0.0]() (2026-03-30)

  ###
  Features

    -
    change publish package to npm ([#62](https://github.com/duydpdev/style-generator-private/issues/62))
    ([5ce9fad]())

# [1.7.0-DEV.1]() (2026-03-30)

  ###
  Features

    -
    change publish package to npm ([#62](https://github.com/duydpdev/style-generator-private/issues/62))
    ([5ce9fad]())

# [1.6.0]() (2026-03-30)

  ###
  Bug Fixes

    -
    fix gensafelist border ([#53](https://github.com/duydpdev/style-generator-private/issues/53))
    ([6a654c0]())
    -
    fix interface zindex ([#57](https://github.com/duydpdev/style-generator-private/issues/57))
    ([8ca4f43]())
    -
    fix repsonsive ([#54](https://github.com/duydpdev/style-generator-private/issues/54))
    ([4e41e8f]())
    -
    fix spacing css gen ([#49](https://github.com/duydpdev/style-generator-private/issues/49))
    ([4ed7916]())
    -
    fix tempalte gen plugins ([#55](https://github.com/duydpdev/style-generator-private/issues/55))
    ([72dead0]())
    -
    update logic gen plugin, safelist, design token ([#58](https://github.com/duydpdev/style-generator-private/issues/58))
    ([0047ebf]())

  ###
  Features

    -
    add api gen cva function ([#50](https://github.com/duydpdev/style-generator-private/issues/50))
    ([53770f5]())
    -
    upadate lib with new doc tailwind ([#60](https://github.com/duydpdev/style-generator-private/issues/60))
    ([0031e0f]())
    -
    update claude code setting ([#56](https://github.com/duydpdev/style-generator-private/issues/56))
    ([e9e8c4d]())
    -
    update cli ([#48](https://github.com/duydpdev/style-generator-private/issues/48))
    ([09a1b54]())
    -
    update gen design token cammelCase ([#51](https://github.com/duydpdev/style-generator-private/issues/51))
    ([9c6454e]())
    -
    update plan imrovement lib ([#59](https://github.com/duydpdev/style-generator-private/issues/59))
    ([287b712]())
    -
    update type responsiveValue ([#52](https://github.com/duydpdev/style-generator-private/issues/52))
    ([49d6761]())

# [1.6.0-DEV.13]() (2026-03-17)

  ###
  Features

    -
    upadate lib with new doc tailwind ([#60](https://github.com/duydpdev/style-generator-private/issues/60))
    ([0031e0f]())

# [1.6.0-DEV.12]() (2026-03-13)

  ###
  Features

    -
    update plan imrovement lib ([#59](https://github.com/duydpdev/style-generator-private/issues/59))
    ([287b712]())

# [1.6.0-DEV.11]() (2026-03-13)

  ###
  Bug Fixes

    -
    update logic gen plugin, safelist, design token ([#58](https://github.com/duydpdev/style-generator-private/issues/58))
    ([0047ebf]())

# [1.6.0-DEV.10]() (2026-03-12)

  ###
  Bug Fixes

    -
    fix interface zindex ([#57](https://github.com/duydpdev/style-generator-private/issues/57))
    ([8ca4f43]())

# [1.6.0-DEV.9]() (2026-03-12)

  ###
  Features

    -
    update claude code setting ([#56](https://github.com/duydpdev/style-generator-private/issues/56))
    ([e9e8c4d]())

# [1.6.0-DEV.8]() (2026-03-09)

  ###
  Bug Fixes

    -
    fix tempalte gen plugins ([#55](https://github.com/duydpdev/style-generator-private/issues/55))
    ([72dead0]())

# [1.6.0-DEV.7]() (2026-03-09)

  ###
  Bug Fixes

    -
    fix repsonsive ([#54](https://github.com/duydpdev/style-generator-private/issues/54))
    ([4e41e8f]())

# [1.6.0-DEV.6]() (2026-03-08)

  ###
  Bug Fixes

    -
    fix gensafelist border ([#53](https://github.com/duydpdev/style-generator-private/issues/53))
    ([6a654c0]())

# [1.6.0-DEV.5]() (2026-03-08)

  ###
  Features

    -
    update type responsiveValue ([#52](https://github.com/duydpdev/style-generator-private/issues/52))
    ([49d6761]())

# [1.6.0-DEV.4]() (2026-03-08)

  ###
  Features

    -
    update gen design token cammelCase ([#51](https://github.com/duydpdev/style-generator-private/issues/51))
    ([9c6454e]())

# [1.6.0-DEV.3]() (2026-03-08)

  ###
  Features

    -
    add api gen cva function ([#50](https://github.com/duydpdev/style-generator-private/issues/50))
    ([53770f5]())

# [1.6.0-DEV.2]() (2026-03-08)

  ###
  Bug Fixes

    -
    fix spacing css gen ([#49](https://github.com/duydpdev/style-generator-private/issues/49))
    ([4ed7916]())

# [1.6.0-DEV.1]() (2026-03-07)

  ###
  Features

    -
    update cli ([#48](https://github.com/duydpdev/style-generator-private/issues/48))
    ([09a1b54]())

# [1.5.0]() (2026-03-07)

  ###
  Bug Fixes

    -
    fix readme docs ([#46](https://github.com/duydpdev/style-generator-private/issues/46))
    ([58e84c8]())

  ###
  Features

    -
    Add option to disable color prefixing for CSS variables and introduce new test files for safelist, design tokens, and CSS variables. ([#45](https://github.com/duydpdev/style-generator-private/issues/45))
    ([27e8c18]())

# [1.5.0-DEV.2]() (2026-03-07)

  ###
  Bug Fixes

    -
    fix readme docs ([#46](https://github.com/duydpdev/style-generator-private/issues/46))
    ([58e84c8]())

# [1.5.0-DEV.1]() (2026-03-07)

  ###
  Features

    -
    Add option to disable color prefixing for CSS variables and introduce new test files for safelist, design tokens, and CSS variables. ([#45](https://github.com/duydpdev/style-generator-private/issues/45))
    ([27e8c18]())

# [1.4.0]() (2026-03-06)

  ###
  Features

    -
    update agent & refactore code ([#43](https://github.com/duydpdev/style-generator-private/issues/43))
    ([2bc3725]())

# [1.4.0-DEV.1]() (2026-03-06)

  ###
  Features

    -
    update agent & refactore code ([#43](https://github.com/duydpdev/style-generator-private/issues/43))
    ([2bc3725]())

# [1.3.0]() (2026-03-06)

###

Bug Fixes

    -
    fix cicd 3 ([#33](https://github.com/duydpdev/style-generator-private/issues/33))
    ([9ff24ea]())
    -
    fix cicd 4 ([#34](https://github.com/duydpdev/style-generator-private/issues/34))
    ([e8374da]())
    -
    remove code
    ([cf51a03]())
    -
    remove code
    ([e90c0b8]())
    -
    update version node for cicd ([#41](https://github.com/duydpdev/style-generator-private/issues/41))
    ([fe2c3a7]())

###

Features

    -
    implement cli for lib phase 1 ([#31](https://github.com/duydpdev/style-generator-private/issues/31))
    ([88c327a]())
    -
    merge develop into main
    ([090961d]())

# [1.3.0-DEV.5]() (2026-03-06)

###

Bug Fixes

    -
    remove code
    ([cf51a03]())
    -
    remove code
    ([e90c0b8]())
    -
    update version node for cicd ([#41](https://github.com/duydpdev/style-generator-private/issues/41))
    ([fe2c3a7]())

# [1.3.0-DEV.4]() (2026-03-05)

###

Bug Fixes

    -
    fix cicd 4 ([#34](https://github.com/duydpdev/style-generator-private/issues/34))
    ([e8374da]())

# [1.3.0-DEV.3]() (2026-03-05)

###

Bug Fixes

    -
    fix cicd 3 ([#33](https://github.com/duydpdev/style-generator-private/issues/33))
    ([9ff24ea]())

# [1.3.0-DEV.2]() (2026-03-05)

# [1.3.0-DEV.1]() (2026-03-05)

###

Features

    -
    implement cli for lib phase 1 ([#31](https://github.com/duydpdev/style-generator-private/issues/31))
    ([88c327a]())

# [1.2.0]() (2026-03-04)

###

Bug Fixes

    -
    apply review feedback: circular imports, docs, types, border wiring ([#13](https://github.com/duydpdev/style-generator-private/issues/13))
    ([c47a7be]())
    -
    CI auto-run for all PRs + squash-merge compatibility ([#23](https://github.com/duydpdev/style-generator-private/issues/23))
    ([d4e80e9]())
    -
    Dedup CHANGELOG, fix Yarn token interpolation, add CI permissions, add wip commitlint type ([#25](https://github.com/duydpdev/style-generator-private/issues/25))
    ([26bb85d]())
    -
    fix cicd ([#28](https://github.com/duydpdev/style-generator-private/issues/28))
    ([004335c]())
    -
    fix cicd 2
    ([74bbb2d]())
    -
    fix conflict ([#19](https://github.com/duydpdev/style-generator-private/issues/19))
    ([5d5718c]())
    -
    fix conflict 1 ([#20](https://github.com/duydpdev/style-generator-private/issues/20))
    ([83ce268]())
    -
    fix conflict 2 ([#21](https://github.com/duydpdev/style-generator-private/issues/21))
    ([40e1062]())
    -
    remove check title PR cicd ([#27](https://github.com/duydpdev/style-generator-private/issues/27))
    ([eec4eff]())

###

Features

    -
    merge develop into main
    ([cc33ced]())
    -
    merge develop into main ([#26](https://github.com/duydpdev/style-generator-private/issues/26))
    ([fe58f86]())
    -
    update safe typescript safelist
    ([2631b60]())
    -
    update yarnrc ([#17](https://github.com/duydpdev/style-generator-private/issues/17))
    ([72833a0]())

###

Reverts

    -
    Revert "Initial plan ([#14](https://github.com/duydpdev/style-generator-private/issues/14))" ([#15](https://github.com/duydpdev/style-generator-private/issues/15))
    ([9a986da]())

# [1.2.0-DEV.1]() (2026-03-04)

###

Bug Fixes

    -
    apply review feedback: circular imports, docs, types, border wiring ([#13](https://github.com/duydpdev/style-generator-private/issues/13))
    ([c47a7be]())
    -
    CI auto-run for all PRs + squash-merge compatibility ([#23](https://github.com/duydpdev/style-generator-private/issues/23))
    ([d4e80e9]())
    -
    Dedup CHANGELOG, fix Yarn token interpolation, add CI permissions, add wip commitlint type ([#25](https://github.com/duydpdev/style-generator-private/issues/25))
    ([26bb85d]())
    -
    fix cicd ([#28](https://github.com/duydpdev/style-generator-private/issues/28))
    ([004335c]())
    -
    fix cicd 2
    ([74bbb2d]())
    -
    fix conflict ([#19](https://github.com/duydpdev/style-generator-private/issues/19))
    ([5d5718c]())
    -
    fix conflict 1 ([#20](https://github.com/duydpdev/style-generator-private/issues/20))
    ([83ce268]())
    -
    fix conflict 2 ([#21](https://github.com/duydpdev/style-generator-private/issues/21))
    ([40e1062]())
    -
    remove check title PR cicd ([#27](https://github.com/duydpdev/style-generator-private/issues/27))
    ([eec4eff]())

###

Features

    -
    merge develop into main ([#26](https://github.com/duydpdev/style-generator-private/issues/26))
    ([fe58f86]())
    -
    update safe typescript safelist
    ([2631b60]())
    -
    update yarnrc ([#17](https://github.com/duydpdev/style-generator-private/issues/17))
    ([72833a0]())

###

Reverts

    -
    Revert "Initial plan ([#14](https://github.com/duydpdev/style-generator-private/issues/14))" ([#15](https://github.com/duydpdev/style-generator-private/issues/15))
    ([9a986da]())

# [1.2.0-DEV.1]() (2026-03-04)

### Bug Fixes

- apply review feedback: circular imports, docs, types, border wiring ([#13](https://github.com/duydpdev/style-generator-private/issues/13)) ([c47a7be]())
- CI auto-run for all PRs + squash-merge compatibility ([#23](https://github.com/duydpdev/style-generator-private/issues/23)) ([d4e80e9]())
- Dedup CHANGELOG, fix Yarn token interpolation, add CI permissions, add wip commitlint type ([#25](https://github.com/duydpdev/style-generator-private/issues/25)) ([26bb85d]())
- fix cicd ([#28](https://github.com/duydpdev/style-generator-private/issues/28)) ([004335c]())
- fix conflict ([#19](https://github.com/duydpdev/style-generator-private/issues/19)) ([5d5718c]())
- fix conflict 1 ([#20](https://github.com/duydpdev/style-generator-private/issues/20)) ([83ce268]())
- fix conflict 2 ([#21](https://github.com/duydpdev/style-generator-private/issues/21)) ([40e1062]())
- remove check title PR cicd ([#27](https://github.com/duydpdev/style-generator-private/issues/27)) ([eec4eff]())

### Features

- merge develop into main ([#26](https://github.com/duydpdev/style-generator-private/issues/26)) ([fe58f86]())
- update safe typescript safelist ([2631b60]())
- update yarnrc ([#17](https://github.com/duydpdev/style-generator-private/issues/17)) ([72833a0]())

### Reverts

- Revert "Initial plan ([#14](https://github.com/duydpdev/style-generator-private/issues/14))" ([#15](https://github.com/duydpdev/style-generator-private/issues/15)) ([9a986da]())

# [1.2.0-DEV.1]() (2026-03-04)

### Bug Fixes

- apply review feedback: circular imports, docs, types, border wiring ([#13](https://github.com/duydpdev/style-generator-private/issues/13)) ([c47a7be]())
- CI auto-run for all PRs + squash-merge compatibility ([#23](https://github.com/duydpdev/style-generator-private/issues/23)) ([d4e80e9]())
- Dedup CHANGELOG, fix Yarn token interpolation, add CI permissions, add wip commitlint type ([#25](https://github.com/duydpdev/style-generator-private/issues/25)) ([26bb85d]())
- fix conflict ([#19](https://github.com/duydpdev/style-generator-private/issues/19)) ([5d5718c]())
- fix conflict 1 ([#20](https://github.com/duydpdev/style-generator-private/issues/20)) ([83ce268]())
- fix conflict 2 ([#21](https://github.com/duydpdev/style-generator-private/issues/21)) ([40e1062]())
- remove check title PR cicd ([#27](https://github.com/duydpdev/style-generator-private/issues/27)) ([eec4eff]())

### Features

- merge develop into main ([#26](https://github.com/duydpdev/style-generator-private/issues/26)) ([fe58f86]())
- update safe typescript safelist ([2631b60]())
- update yarnrc ([#17](https://github.com/duydpdev/style-generator-private/issues/17)) ([72833a0]())

### Reverts

- Revert "Initial plan ([#14](https://github.com/duydpdev/style-generator-private/issues/14))" ([#15](https://github.com/duydpdev/style-generator-private/issues/15)) ([9a986da]())

# [1.2.0-DEV.1]() (2026-03-04)

### Bug Fixes

- apply review feedback: circular imports, docs, types, border wiring ([#13](https://github.com/duydpdev/style-generator-private/issues/13)) ([c47a7be]())
- CI auto-run for all PRs + squash-merge compatibility ([#23](https://github.com/duydpdev/style-generator-private/issues/23)) ([d4e80e9]())
- Dedup CHANGELOG, fix Yarn token interpolation, add CI permissions, add wip commitlint type ([#25](https://github.com/duydpdev/style-generator-private/issues/25)) ([26bb85d]())
- fix conflict ([#19](https://github.com/duydpdev/style-generator-private/issues/19)) ([5d5718c]())
- fix conflict 1 ([#20](https://github.com/duydpdev/style-generator-private/issues/20)) ([83ce268]())
- fix conflict 2 ([#21](https://github.com/duydpdev/style-generator-private/issues/21)) ([40e1062]())

### Features

- merge develop into main ([#26](https://github.com/duydpdev/style-generator-private/issues/26)) ([fe58f86]())
- update safe typescript safelist ([2631b60]())
- update yarnrc ([#17](https://github.com/duydpdev/style-generator-private/issues/17)) ([72833a0]())

### Reverts

- Revert "Initial plan ([#14](https://github.com/duydpdev/style-generator-private/issues/14))" ([#15](https://github.com/duydpdev/style-generator-private/issues/15)) ([9a986da]())

# [1.2.0-DEV.1]() (2026-03-04)

### Bug Fixes

- apply review feedback: circular imports, docs, types, border wiring ([#13](https://github.com/duydpdev/style-generator-private/issues/13)) ([c47a7be]())
- CI auto-run for all PRs + squash-merge compatibility ([#23](https://github.com/duydpdev/style-generator-private/issues/23)) ([d4e80e9]())
- Dedup CHANGELOG, fix Yarn token interpolation, add CI permissions, add wip commitlint type ([#25](https://github.com/duydpdev/style-generator-private/issues/25)) ([26bb85d]())
- fix conflict ([#19](https://github.com/duydpdev/style-generator-private/issues/19)) ([5d5718c]())
- fix conflict 1 ([#20](https://github.com/duydpdev/style-generator-private/issues/20)) ([83ce268]())
- fix conflict 2 ([#21](https://github.com/duydpdev/style-generator-private/issues/21)) ([40e1062]())

### Features

- update safe typescript safelist ([2631b60]())
- update yarnrc ([#17](https://github.com/duydpdev/style-generator-private/issues/17)) ([72833a0]())

### Reverts

- Revert "Initial plan ([#14](https://github.com/duydpdev/style-generator-private/issues/14))" ([#15](https://github.com/duydpdev/style-generator-private/issues/15)) ([9a986da]())

# 1.2.0-DEV.1 (2026-03-04)

### Bug Fixes

- apply review feedback: circular imports, docs, types, border wiring ([#13](https://github.com/duydpdev/style-generator-private/issues/13)) c47a7be
- CI auto-run for all PRs + squash-merge compatibility ([#23](https://github.com/duydpdev/style-generator-private/issues/23)) d4e80e9
- fix conflict ([#19](https://github.com/duydpdev/style-generator-private/issues/19)) 5d5718c
- fix conflict 1 ([#20](https://github.com/duydpdev/style-generator-private/issues/20)) 83ce268
- fix conflict 2 ([#21](https://github.com/duydpdev/style-generator-private/issues/21)) 40e1062

### Features

- update safe typescript safelist 2631b60
- update yarnrc ([#17](https://github.com/duydpdev/style-generator-private/issues/17)) 72833a0

### Reverts

- Revert "Initial plan ([#14](https://github.com/duydpdev/style-generator-private/issues/14))" ([#15](https://github.com/duydpdev/style-generator-private/issues/15)) 9a986da

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

# 1.2.0-DEV.1 (2026-03-01)

### Features

- update safelist & token 612e3f0

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

# 1.0.0 (2026-02-14)

### Features

- init project 4ea7557
- update package name & workflow 22de09f
- update package.json 9fc6c7b
- update package.json 2a789e6
- update scripts package.json 03d21ed
