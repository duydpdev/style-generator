---
paths:
  - "examples/**"
  - "site/**"
---

# Examples, site and docs commands

Loaded when a file under `examples/` or `site/` is read.

## Commands

```bash
yarn workspace plain-react-example test   # after build:all + `yarn playwright install chromium`: Storybook stories + plain-vs-harness class parity gate (Vitest browser, Chromium)
yarn workspace plain-nuxt-example test:stories   # needs `prepare:nuxt` first (CI job `plain-nuxt`)
node examples/plain-react/scripts/copy-out-smoke.mjs   # after build:all: a copied src/ui/button/ type-checks with the packed tarball + peers only (CI)
yarn check:tokens   # after build:all: `generate --check` in each app that commits a theme.tokens.ts (plain-react, plain-nuxt, design-system, site) — fails when one is stale (CI)
yarn site:build     # lib build + landing site (renders documents/*.md)
yarn schema:refresh # build:cli + rewrite the six committed theme/config JSON Schemas (examples/, examples/design-system/, site/) and prettier them
yarn docs:embed         # rewrite <!-- embed: path#region --> blocks from the marked example regions
yarn docs:signatures    # rewrite <!-- signature: Name --> blocks in documents/reference from dist/*.d.ts (after build:all)
yarn check:docs    # docs gates (after build:all; CI `docs` job runs them as five steps): embed, i18n, snippets, exports, reference; doc-reference: CLI flags + config keys documented, no version history on pages
yarn check:plain-ui     # examples/plain-react/src/ui/<folder>/: style.ts, types.ts, <Name>.tsx, index.ts; relative imports only ./… and ../../theme; package allow-list (CI)
```

## Sample components and plain apps

Sample components (examples, not an API; nothing is published): `Box`, `Text`, `Stack`, `Flex`, `Grid`, `Button` live in the harness app over the `examples/design-system` recipes.
React: `examples/harness/src/ui/*.tsx`, each a self-contained factory file `create<Name>(tokens, preset?)` with its own prop types and `Polymorphic` type (all six import
`splitLayout`/`splitSpacing`/`mergeStyle` from `@duydpdev/style-generator/ui` and `Polymorphic` from `/ui-react`;
`src/ui/layout.ts` keeps only the harness's `LayoutProps` type and `LAYOUT_SIZE_KEYS`), exported as `harness-example/ui` and bound once in `examples/harness/src/ui.ts`;
`site` imports the same files and binds them to its own tokens in `site/src/ui.ts`. Recipes are theme-free factories in `design-system-example/recipes` (`create<Name>Recipe`,
`<name>Tables`, built with `recipeFromTables` from `./ui`) plus the bound recipes and presets in `design-system-example`.
ESLint reads component names and banned tags from `examples/ui-registry.mjs`. Touchpoints for a new component, app-code and layout rules: `documents/components.md`.
Plain apps (copy-paste, never import the harness): `examples/plain-react` (Storybook + parity gate) and `examples/plain-nuxt`,
one folder per component in `src/ui/<folder>/` (Nuxt `app/ui/<folder>/`) over `@duydpdev/style-generator/ui`;
`yarn check:plain-ui` enforces the layout and the identical `style.ts`; lint also needs `yarn workspace plain-nuxt-example prepare:nuxt`.
