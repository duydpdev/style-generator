---
paths:
  - "src/core/**"
  - "src/features/**"
  - "src/shared/**"
  - "src/exports/**"
  - "src/index.ts"
  - "src/__integration__/**"
---

# Theme, registry and feature rules

Loaded when a file under `src/core`, `src/features`, `src/shared`, `src/exports`, `src/__integration__` or `src/index.ts` is read. Source layout and public exports: `documents/architecture.md`, `documents/reference/`.

## Architecture

```text
theme.json → generate(theme, options) → { css, tokens, schema }
```

`generate()` (`src/core/generate.ts`) validates `options` first (`StyleGeneratorOptionsSchema.parse` → `resolveOptions`),
then always re-validates `theme` against `ThemeSchema` (a Zod `strictObject` with `.superRefine()` alias/injection checks — unknown keys throw a `ZodError`),
then returns `css` (written to a file and `@import`ed next to `@import "tailwindcss";`), `tokens` (typed `DesignTokens.Web.*`,
one array per `ThemeConfig` field under the same name — `colors`, `typography`, `borderRadius`, … — plus `spacingProperties`/`breakpoints`/`screens`;
also `createDesignTokens()` from `./tokens`) and `schema` (`z.toJSONSchema(ThemeSchema)`).

Pipelines, all driven by the category registry:

1. **registry** (`src/features/registry/`) — `builtInCategories.ts` declares one `TokenCategoryDescriptor` per category (`colors`, `typography`, `shadows`, `backdropBlurs`,
   `borderRadius`, `fontFamily`, `borderWidth`, and the `literalScale` groups `motionDuration`→`duration`, `motionEasing`→`ease`, `controlHeight`→`h-control`, `iconSize`→`size-icon`,
   `opacity`, `zIndex`→`z` (no `$` aliases; `coverage` takes only `true`/`false`/`{ keys: "all" }`; a digit-only `opacity` key is rejected because `--opacity-<n>` would replace the colour `/<n>` modifier; `--height-control-*` also yields `min-h-control-*`/`max-h-control-*`, which `createTailwindMergeExtension` groups but `@source inline` does not cover); `colors` feeds `bg`, `text`, `border`, `ring`, `outline`, `divide`, `placeholder`);
   `generateSourceInline.ts` emits one `@source inline(...)` per category.
2. **theme-css** (`src/features/theme-css/`) — `:root` `--sg-*` vars, `html[data-<axis>="<variant>"]` overrides,
   `@theme inline` mapping (including `--border-width-<key>` for `borderWidth`); `generateScreensCss.ts` (custom breakpoints).
3. **tokens**, **typography** (`@utility <kebab-key>`), **spacing** (`.sp-*` utilities over `var(--sg-sp-*)`), **cva**, **vite**, **next** under `src/features/`.
   **recipes** (`./recipes`: `createTailwindMergeExtension`, `splitSpacingProps`/`SpacingProps`, `themeAxisAttributes`) is subpath-only (not re-exported from `.`), browser-safe,
   and imports nothing from `tailwind-merge` (structural `TailwindMergeExtension` type; the app owns that dependency; `check:externals` fails if any entry but `./ui` imports it).
   **ui** (`./ui`: `recipeFromTables`, `pick`, `contrastText`, `createCn`, `splitSpacing`, `splitLayout`, `mergeStyle` + types, `src/features/ui/`; `./ui-react`:
   type-only `Polymorphic`) is subpath-only; `class-variance-authority`, `clsx`, `tailwind-merge`, `@types/react` are optional peers (ranges in `package.json#peerDependencies`;
   `ui-peer-floor` tests their floors). `borderRadius` goes through tailwind-merge's `radius` theme scale (every `rounded-*` group reads it);
   its local prefix table for `border`/`divide-*`/`shadow`/`backdrop-blur` is pinned to the registry descriptors by `extendTailwindMerge.test.ts`;
   do not import `builtInCategories.ts`/`classPrefixes.ts` from it (that would split a shared chunk and grow `./tokens`).
   `recipeFromTables(tables)` returns `RecipeFn<typeof tables>` (props typed by the tables' variant names; a bare `RecipeFn` is the loose `(props?: RecipeProps) => string` and opts out of the check);
   `splitLayout(props, { recipe, spacingKeys, variantKeys, sizeKeys, extra? })` takes one options object (`SplitLayoutOptions`).
   Every public symbol has ONE import path (8.0): `COLOR_STATES` from `./cva` only; `ResponsiveValueStrict`, `DefaultBreakpointKeys`, `SpacingKey` from `./types` only; `./spacing` exports `resolveSpacing`
   and `DEFAULT_SPACING_PROPERTIES` (`resolveSpacingProps` is gone).

`DEFAULT_BREAKPOINTS = ["md", "lg"]` (`src/shared/defaultOption.ts`) is the single fallback for `@source inline` variants,
spacing `@media` chains and `DesignTokens.Web.breakpoints` when `options.breakpoints` is unset. Why `md`/`lg` only:
defaulting to every `screens` key would advertise breakpoints no `@source inline` line covers. `src/shared/classPrefixes.ts` holds the `roundedProperties`/`borderProperties`
class-prefix lists.

Source layout: `documents/architecture.md`; public exports per subpath and CLI: `documents/reference/`.
The internal helper `toCamelCase` is not exported from any barrel; `toKebabCase` is public (from `./cva`) because it is the function the registry and
`createVariantMapper` share. Breaking changes from 3.x: `documents/migration/3.x-to-4.0.md`; from 4.x: `documents/migration/4.x-to-5.0.md`; from 5.x:
`documents/migration/5.x-to-6.0.md`; from 6.x: `documents/migration/6.x-to-7.0.md`; from 7.x: `documents/migration/7.x-to-8.0.md`; from 8.x: `documents/migration/8.x-to-9.0.md`.

## Theme / Color Rules (current v4 API)

- `colors` is the only **required** field in `ThemeConfig`; all others (`typography`, `shadows`, `backdropBlurs`, `borderRadius`, `fontFamily`, `borderWidth`, `themeAxes`) are optional.
- Colors are a **flat camelCase** object. Nested color objects and `DEFAULT` key are unsupported.
- Key conversion: camelCase → kebab-case CSS vars/classes. Letter→digit boundary adds a dash (`blue500` → `blue-500`); digit-prefix tokens preserved (`2xl`).
  Keys that collide once kebab-cased (`blue500`/`blue-500`) are rejected. **`_` and a leading uppercase run of two or more letters (`CTA`, `ABtn`,
  `HTMLParser`) are rejected in every token-name position**: the camelCased token would map to a class the registry never emits (a single capital such as `Blue`,
  or an inner run such as `primaryCTA`, round-trips and is accepted). `formatZodError` prints the hint on the path.
  Each category owns a distinct `--sg-<category>-` namespace (`sg-color`, `sg-shadow`, `sg-backdrop-blur`, `sg-radius`, `sg-font`, `sg-border-width`, `sg-duration`, `sg-ease`, `sg-control`, `sg-icon`, `sg-opacity`, `sg-z`, plus spacing's `sg-sp`),
  so cross-category variable collisions are impossible by construction. A `typography` key kebab-casing to `sp-*` or `font-*` is rejected,
  and `typography.*.fontWeight` is a number in 1–1000.
- A `__proto__` key is rejected at its exact path wherever it appears in a theme (`rejectProtoKeys`, the raw-input `z.preprocess` step of `ThemeSchema`, `src/core/themeSchema.ts`):
  Zod's `z.record` skips that key before the key schema runs, so without the scan the token would be dropped silently. Only a parsed JSON document can carry it as an own key.
  The options records (`screens`, `spacing.properties`) are not scanned: they hold no token names.
- `themeAxes: Record<axisName, Record<variantName, ThemeOverride>>` — independent axes (e.g. `theme.dark` and `palette.forest` at once),
  each activated via `html[data-<axis-kebab>="<variant-kebab>"]` (`axisAttributeName`, `src/shared/axisAttributeName.ts`, shared with `themeAxisAttributes`).
  The selector is always pinned to `html` and the attribute name is not configurable, because a `$`-alias `var()` resolves where the custom property is declared (`:root`);
  a scoped theme on another element or a custom attribute name is hand-written CSS in the app.
  Blocks emit after `:root` in declaration order, so for a token overridden by two axes the axis declared **last** wins.
- An override key must already exist in the matching base category — override-only keys are rejected (they would produce no utility).
- Axis and variant names must NOT be canonical integers (`/^(0|[1-9]\d*)$/`) — JS enumerates integer-like keys first, which would silently invert "last declared wins". `007`/`2xl` are fine.
- Variant names of one axis must not kebab-case to the same attribute value (`darkMode` ≡ `dark-mode`).
  Alias cycles are also checked across axes (`validateCrossAxisAliasCycles`, `src/core/aliasGraph.ts`):
  every combination of at most one variant per axis is merged in declaration order, because all axes apply to the same `html` element at once;
  the cycle is reported at the later axis.
- Alias `"$<key>"` resolves within the SAME category to `var(--<cssVarPrefix>-<kebab-key>)` using that category's `cssVarPrefix` (`src/features/registry/builtInCategories.ts`):
  `$blue500` in `colors` → `var(--sg-color-blue-500)`, `$base` in `shadows` → `var(--sg-shadow-base)`. Existence and acyclicity are validated at parse time.
  Use the raw key (`$blue500`, not `$blue-500`). In `colors` only, `"$<key>/<n>"` (n an integer percent 1–100, `parseAliasRef`) emits `color-mix(in srgb, var(--sg-color-<kebab-key>) <n>%, transparent)`. Not supported inside `typography`. The emitted `--sg-*` variables (`--sg-color-<key>`, `--sg-shadow-<key>`,
  …) are a public contract (consumers read them); renaming one is breaking.
- `COLOR_STATES` (a `{ suffix, variant }` table: `Hover` → `hover`, `Active` → `active`, `Selected` → `aria-selected`; `src/shared/colorStates.ts`, exported from `./cva` only with the `ColorState` type) is the single state table for the registry's `@source inline` state lines and
  `createVariantMapper(prefix, tokens, { states: COLOR_STATES })` (`states` takes `readonly ColorState[]`, not plain strings, since 9.0). Sibling detection uses camelCased keys (`primary-hover` ≡ `primaryHover`);
  the class is chained behind the row's `variant` as written (`primarySelected` → `aria-selected:bg-primary-selected`).
- `contrastText(colors, intent, fallback)` reads only `<intent>Foreground` (9.0); `on<Intent>` keys are not read, and `style-gen doctor` names their v2 rename (`src/cli/commands/deprecatedColorKeys.ts`).
- A theme key whose class equals a Tailwind _static_ utility (`bg-none`, typography `text-sm`, …) is not rejected, but Tailwind picks the winner — rename it (`clear`, `flat`,
  `zero`). `style-gen doctor` warns on known collisions (`src/cli/commands/utilityCollisions.ts`). A digit-only `borderWidth` key (`2`) is an override, not a tie:
  with `--border-width-2` in `@theme`, Tailwind resolves `border-2`/`border-x-2`/`divide-x-2` to the theme value; doctor still warns so the override is deliberate.
- `fontFamily` keys must not kebab-case to a font-_weight_ name (`thin` … `black`) or start with the `weight`/`size` segment (`weightBold` → `--font-weight-bold` is Tailwind's
  weight scale, not a family) — all share the `font-` prefix. A `typography` key must not equal another category's class (`<classPrefix>-<kebab key>`:
  `colors.primary` + `typography.textPrimary` → `text-primary`), checked from the registry's `classPrefixes` (`checkTypographyClassCollisions`).
- `borderWidth` replaces `border` (omitted or empty → Tailwind's `border-0/1/2/4`); a key sharing a color's `border-*` class (`thinLine`/`thin-line`) is invalid.
  A `colors` key kebab-casing to `x`, `y`, `x-<integer>`/`y-<integer>` or `x-<borderWidth key>` is rejected (`checkDivideColorCollision`:
  `divide-<key>` would be a Tailwind divider width).
- `generate()` validates options with a strict schema (`src/core/optionsSchema.ts`, internal): unknown keys rejected (also in `spacing`/`typography`); flags are booleans;
  `screens` values are one px/rem/em length and the map merged with `defaultScreens` uses one unit; `breakpoints` must name a screen.
  `style-gen.config.json` uses the same Shape (`StyleGenConfigSchema`, `src/node/loadStyleGenConfig.ts`, shared by the CLI, `styleGenVite` and `styleGenNext`);
  the file-level `StyleGenConfigFileSchema` adds the `$schema` editor pointer (dropped on read, never reaches `generate()`) and is what the config JSON Schema is generated from.
  `extraSources` and `axes` are plain unknown keys: classes built at runtime are declared by the app with its own `@source inline(...)` next to the generated import.
- `options.coverage` (`Partial<Record<CategoryKey, boolean | { prefixes?, keys?: "aliased" | "all", opacities? }>>`) only changes the registry's `@source inline` lines:
  `false` drops a category's lines (state lines included), `prefixes` must be a **non-empty** list of real `classPrefixes` of that category (typography has none),
  `keys: "aliased"` keeps the alias **holders** — declared keys whose value is a `$alias` in the base record or any `themeAxes` override of the same category;
  the primitives they point to need no class (rejected for `typography`, which has no aliases). `opacities` (distinct integers 1–100, non-empty;
  only for categories whose descriptor sets `opacityModifier`, i.e. `colors`) adds ONE line `{bg,text,border,ring,outline,divide,placeholder}-{keys}/{steps}` right after the
  category line, following `prefixes`/`keys`, steps sorted ascending in `resolveOptions`, never crossed with the state lines. An `opacities` entry may be a group
  `{ steps, prefixes?, keys? }` that adds its own line after the plain-step line (`prefixes` checked in the schema, `keys` against `theme.colors` in `assertThemeOptions`, error path
  `coverage.colors.opacities.<i>.keys.<j>`); groups never reach `DesignTokens.Web.opacities`. A group's own `prefixes`/`keys` are not limited to the rule's; a step repeated across plain steps and groups, or two identical groups, are accepted and build one class (`tailwind-compile.test.ts`); `budget --coverage-cost` (`suggestCoverage`) appends `(opacity group <i> still adds it)` (`<i>` = zero-based index in `opacities`) when a group lists the prefix itself.
  The plain steps are `DesignTokens.Web.opacities` (`OpacitySteps<O>`, `resolveTokenOptions`), which `createVariantMapper(prefix, colors, { opacities })` turns into `token/step`
  keys; coverage changes no other typed token. Absent/`true`/`{}` is byte-identical to no option. `generate()` resolves every option default once in `resolveOptions()`
  (`src/core/resolveOptions.ts`, which spreads the slim `resolveTokenOptions()`); never re-apply `options.x ?? DEFAULT_X` downstream.
  Category defaults live in `src/features/registry/categoryTokenMeta.ts` (descriptors spread it); both it and `resolveTokenOptions.ts` must stay separate small files so the
  `./tokens` gzip budget holds (`vite.config.ts` sets `preserveEntrySignatures: "allow-extension"` for the same reason).
- Values must balance `(`/`[`. `typography.*.letterSpacing` is optional. `formatZodError` is exported from `.`.
- `options.resetTailwindDefaults` (`("colors" | "radius" | "shadow")[]`) adds `--color-*: initial;` / `--radius-*: initial;` / `--shadow-*: initial;` as the FIRST lines of
  `@theme inline` (order matters: after the mapping they would wipe the theme's own variables); `"colors"` also drops `--color-white`/`--color-black`;
  each name needs a NON-EMPTY replacement in the theme: `"colors"` needs `colors` (the schema accepts `colors: {}`), `"radius"` needs `borderRadius`,
  `"shadow"` needs `shadows` (cross-field check in `assertThemeOptions`, `src/core/themeOptionsChecks.ts`; `ZodError` at `resetTailwindDefaults.<i>`).
- A `themeAxes` variant must not be named `base` (reserved: `"base"` is the "no override" value of `ThemeAxesState`/`themeAxisAttributes`); an axis named `base` is fine.
