# Core API (@duydpdev/style-generator)

The root barrel `@duydpdev/style-generator`: `generate()`, the theme and options helpers, and re-exports of every other subpath; it pulls in Zod, so use a subpath in browser code.

## Subpath exports

For tree-shaking, import from subpaths instead of the root barrel:

```ts
// Generator + validated theme helpers (pulls in Zod) — root barrel only
import {
  generate,
  defineTheme,
  defineOptions,
} from "@duydpdev/style-generator";

// Browser-safe (no Zod, no Node built-ins)
import {
  createDesignTokens,
  COLOR_STATES,
} from "@duydpdev/style-generator/tokens";
import { createVariantMapper } from "@duydpdev/style-generator/cva";
import { resolveSpacingProps } from "@duydpdev/style-generator/spacing";

// Component-side recipes (no Zod; tailwind-merge stays your own dependency)
import {
  createTailwindMergeExtension,
  splitSpacingProps,
  themeAxisAttributes,
} from "@duydpdev/style-generator/recipes";
import type {
  ThemeConfig,
  ColorVariant,
} from "@duydpdev/style-generator/types";

// Build-tool integrations (Node only)
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { styleGenNext } from "@duydpdev/style-generator/next";
```

Requires `tsconfig.json#compilerOptions.moduleResolution` = `"bundler"`, `"node16"`, or `"nodenext"`; **`"node10"` (the legacy `"node"`) is unsupported**: the package has no `typesVersions`, so the subpaths do not resolve there. The ESM and CJS builds each ship their own declaration file (`.d.ts` for `import`, `.d.cts` for `require`), so a CommonJS consumer under `node16`/`nodenext` resolves types instead of hitting the "masquerading as ESM" mismatch (`yarn check:types-pack` verifies it with `@arethetypeswrong/cli`). `dist/*.d.cts` is its `.d.ts` with one rewrite: the `vite` import becomes a type-only `import type { Plugin } from 'vite' assert { 'resolution-mode': 'import' }`, because Vite has no usable CommonJS types (5/6 ship an `export = any` stub, 7/8 are ESM-only). `yarn typecheck:dist` type-checks the `.d.cts` as a CommonJS consumer (`module: node16`, `skipLibCheck: false`). On TypeScript 5.0–5.2 that one `assert` line is reported (`TS4125`) when a CommonJS consumer sets `skipLibCheck: false`; `skipLibCheck: true`, the default in most setups, and TypeScript >= 5.3 are unaffected. See [`documents/migration/3.x-subpath-exports.md`](../migration/3.x-subpath-exports.md) for the background and [`documents/migration/3.x-to-4.0.md`](../migration/3.x-to-4.0.md) for what changed in 4.0.0.

## All exports by subpath

| Export                                                                                                                                      | Subpath                                       | Description                                                                                                                                                                                                 |
| :------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate`                                                                                                                                  | `.`                                           | **Main entry.** Returns `{ css, tokens, schema }` from a Zod-validated theme.                                                                                                                               |
| `defineTheme`, `defineOptions`                                                                                                              | `.`                                           | Type-safe helpers; `defineTheme` also validates at runtime.                                                                                                                                                 |
| `formatZodError`                                                                                                                            | `.`                                           | Formats a `ZodError` thrown by `generate()`/`defineTheme()` as one `path → message` line per issue.                                                                                                         |
| `generateThemeCss`                                                                                                                          | `.`                                           | Just `:root` variables, axis overrides and `@theme inline`; validates the theme (and the optional second-argument `options`, of which only `axes` and `resetTailwindDefaults` matter) like `generate()`.    |
| `createDesignTokens`                                                                                                                        | `.`, `./tokens`                               | Typed `DesignTokens.Web.*`.                                                                                                                                                                                 |
| `createVariantMapper`, `COLOR_STATES`, `toKebabCase`                                                                                        | `.`, `./cva` (`COLOR_STATES` also `./tokens`) | Token keys → class names for CVA, optional `{ states }`; `toKebabCase` is the function the registry and mapper use.                                                                                         |
| `resolveSpacing`, `resolveSpacingProps`                                                                                                     | `.`, `./spacing`                              | Spacing props → `{ className(s), style }`.                                                                                                                                                                  |
| `createTailwindMergeExtension`, `splitSpacingProps`, `themeAxisAttributes`, `SpacingProps`, `TailwindMergeExtension`, `TailwindMergeTokens` | `./recipes` (not in `.`)                      | Component-side recipes, see [Recipes](./recipes.md).                                                                                                                                                        |
| `styleGenVite`                                                                                                                              | `./vite`                                      | Vite plugin writing `theme.css`.                                                                                                                                                                            |
| `styleGenNext`                                                                                                                              | `./next`                                      | Next.js config wrapper writing `theme.css`.                                                                                                                                                                 |
| `Breakpoint`, `defaultScreens`                                                                                                              | `.`, `./tokens`                               | `Breakpoint` const + type and default widths.                                                                                                                                                               |
| `DEFAULT_ROUNDED_VALUES`, `DEFAULT_BORDER_VALUES`                                                                                           | `.`, `./tokens`                               | Fallback values for `borderRadius` / `borderWidth`.                                                                                                                                                         |
| `DEFAULT_SPACING_PROPERTIES`                                                                                                                | `.`, `./spacing`                              | Default spacing key → CSS properties map.                                                                                                                                                                   |
| `roundedProperties`, `borderProperties`                                                                                                     | `.`, `./tokens`                               | Class-prefix lists of the `borderRadius` / `borderWidth` categories.                                                                                                                                        |
| Types: theme & options                                                                                                                      | `./types`, `.`                                | `ThemeConfig`, `ThemeOverride`, `TypographyConfig`, `StyleGeneratorOptions`, `ExactOptions`, `CoverageRule`, `SpacingPropertyMap`, `CategoryKey`.                                                           |
| Types: tokens & inference                                                                                                                   | `./types`, `.`                                | `DesignTokensResult`, `DesignTokensWeb`, `CategoryTokenKey`, `InferBorderWidthOptions`, `InferRoundedOptions`, `InferSpacingKeys`, `BreakpointKeys`, `SpacingKeys`, `ScreenKeys`, `CamelCase`, `KebabCase`. |
| Types: variants                                                                                                                             | `./types`, `.`                                | `DesignTokenKeys`, `ColorVariant`, `TextVariant`, `ShadowVariant`, `BackdropBlurVariant`, `FontFamilyVariant`, `BorderWidthVariant`, `RoundedVariant`.                                                      |
| Types: theme axes                                                                                                                           | `./types`, `.`                                | `ThemeAxisName`, `ThemeAxisVariant`, `ThemeAxesState`.                                                                                                                                                      |
| Types: responsive spacing                                                                                                                   | `./types`, `./spacing`, `.`                   | `ResponsiveValueStrict`, `DefaultBreakpointKeys`.                                                                                                                                                           |
| Types: default values                                                                                                                       | `./types` (`SpacingKey` also `./spacing`)     | `SpacingKey`, `DefaultBorderValue`, `DefaultRoundedValue`.                                                                                                                                                  |
| Types: `GenerateResult`                                                                                                                     | `.` (not in `./types`)                        | Return type of `generate()`.                                                                                                                                                                                |

## Peer dependencies

Peer dependencies (`typescript` and `vite` are optional: install them only if you type-check against the package or use `styleGenVite`):

| Peer          | Range                                   | Tested in CI                      | Notes                                                                                             |
| ------------- | --------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `node`        | `^20.19.0 \|\| >=22.12.0`               | 20.19.0 (built-package smoke), 22 | Unflagged `require(esm)`, so the CJS entries can load the ESM-only `chokidar@5`.                  |
| `tailwindcss` | `^4.1.0`                                | 4.1.x, 4.3.0                      | Tailwind v3 is not supported. `@source inline(...)` needs 4.1+.                                   |
| `typescript`  | `^5 \|\| ^6` (optional)                 | 5.9, 6.0                          | For type-checking against the package's `.d.ts`. TypeScript 7 (native port) is not supported yet. |
| `vite`        | `^5 \|\| ^6 \|\| ^7 \|\| ^8` (optional) | 5.4, 6.4, 7.3, 8.3                | Only for `styleGenVite` (also used by Nuxt).                                                      |

CI runs the latest release of each major in "Tested in CI"; the floor of a range (for example `vite@5.0.0`) is not tested. The `check` job covers the lockfile versions (Vite 7.3, TypeScript 5.9). The `peer-matrix` job covers Vite 5, 6 and 8 and TypeScript 6: it builds `examples/react-v4`, runs a Vite dev server that re-emits on a theme edit, and type-checks the example and `dist/*.d.ts`. A failing leg for a published major fails CI. TypeScript 7 has no CI leg: Yarn's built-in `compat/typescript` patch does not apply to `typescript@7`, so the leg could not even install (see [`documents/testing.md`](../testing.md)).

`zod` is a regular dependency of the package; you do not install it yourself.

## `generate`

<!-- signature: generate -->

```ts
export declare function generate<const TTheme extends ThemeConfig>(
  theme: TTheme,
): GenerateResult<TTheme>;
export declare function generate<
  const TTheme extends ThemeConfig,
  const O extends StyleGeneratorOptions = StyleGeneratorOptions,
>(
  theme: TTheme,
  options: ExactOptions<O> | undefined,
): GenerateResult<TTheme, O>;
```

Generate the complete registry-driven CSS string (breakpoint `@theme`
override + theme vars + `@theme inline` mapping + typography/spacing
`@utility` blocks) and typed design tokens for a theme. Returns a single
static CSS string meant to be written to a file and `@import`ed alongside
`@import "tailwindcss"` (Tailwind v4 only).

Validates `options` first, then `theme` against `ThemeSchema` — independent
of whether the caller already went through `defineTheme()` — so CLI/Vite/
Next callers that hand it raw `JSON.parse()` output get the same
guarantees. Both failures are a `ZodError`; with `axes.scope: "element"`
a variant that would leave a `$`-alias holder stale is rejected too.

With `options`, their literal `breakpoints`, `screens` and
`spacing.properties` keys type `tokens`; options typed as
`StyleGeneratorOptions`, or an explicit `<typeof theme>` type argument
(which leaves `O` at its default), widen them to `string`. Without
`options` the tokens carry the library defaults.

<!-- /signature -->

Compiles a validated theme into `{ css, tokens, schema }`. The theme is described in [Theme config](./theme.md) and the second argument in [Options](./options.md).

## `generateThemeCss`

<!-- signature: generateThemeCss -->

```ts
export declare const generateThemeCss: (
  config: ThemeConfig,
  options?: StyleGeneratorOptions,
) => string;
```

Generate a complete CSS string for Tailwind v4 `\@theme` integration.

Output includes:

1. `:root` block with `--sg-*` intermediate CSS variables
2. `html[data-<axis-kebab>="<variant-kebab>"]` blocks for each `themeAxes`
   axis/variant, in config declaration order (both axes and variants) —
   the selector is pinned to `html` by default because a `$`-alias
   `var()` resolves to the value computed at the element that DECLARES the
   custom property, so an override on a non-root element wouldn't affect
   an alias's inherited value (see `.claude/CLAUDE.md`'s Theme rules).
   `options.axes` renames the attribute per axis and, with
   `scope: "element"`, drops the `html` anchor (guarded by an alias check)
3. `\@theme inline` block: the `resetTailwindDefaults` lines
   (`--color-*: initial;`, …) first, then the mapping of `--sg-*` → Tailwind v4 namespaces

Parses `options` and `config` like `generate()` — options first — so an
invalid or injection-unsafe option or theme throws a `ZodError` instead of
reaching the CSS.

<!-- /signature -->

Builds only the CSS string (`:root` variables, `themeAxes` blocks, `@theme inline` mapping) from an already validated theme. See [Theme config](./theme.md).

## `GenerateResult`

<!-- signature: GenerateResult -->

```ts
export declare interface GenerateResult<
  TTheme extends ThemeConfig,
  O = Record<never, never>,
> {
  css: string;
  tokens: DesignTokensResult<TTheme, O>["DesignTokens"];
  schema: typeof themeJsonSchema;
}
```

What {@link generate} returns for theme `TTheme` and options `O`.

<!-- /signature -->

The type of what `generate()` returns for a theme and options type; it is exported from `.` only, not from `./types`.

## `defineTheme`

<!-- signature: defineTheme -->

```ts
export declare function defineTheme<const T extends ThemeConfig>(config: T): T;
```

Runtime-validated theme config helper — the only place `defineTheme` is
exported from is the root barrel (`.`), never `./tokens`, so Zod never
reaches the browser-safe subpaths. Parses `config` against `ThemeSchema`
and returns the parsed result, throwing a `ZodError` (with a precise
`path`) for unknown keys or CSS-injection-unsafe values.

`generate()`, the CLI, and the Vite plugin all re-validate independently,
so calling `defineTheme()` is optional — but doing so surfaces the same
error as an IDE type error too, since `T` is checked against
`ThemeConfig` at compile time.

<!-- /signature -->

Type-checks and validates a theme at runtime; it throws a `ZodError` for unknown keys or unsafe values. See [Theme config](./theme.md).

## `defineOptions`

<!-- signature: defineOptions -->

```ts
export declare function defineOptions<const O extends StyleGeneratorOptions>(
  options: ExactOptions<O>,
): O;
```

Type-safe options helper. Zero runtime cost. `const O` keeps the literal
`breakpoints`, `screens` and `spacing.properties` keys, which flow into
`DesignTokensWeb<T, O>` when the same object is passed to `generate()` or
`createDesignTokens()`.

<!-- /signature -->

Type-safe options helper with no runtime cost; it keeps literal `breakpoints`, `screens` and `spacing.properties` keys. See [Options](./options.md).

## `formatZodError`

<!-- signature: formatZodError -->

```ts
export declare const formatZodError: (error: z.ZodError) => string;
```

Format every issue in a `ZodError` as one `"path → message"` line, safe to
print to a terminal or throw as a plain `Error` message — every CLI/Vite
consumer that catches a `ZodError` from `ThemeSchema.parse()` funnels it
through this instead of dumping the raw (deeply nested) `ZodError` object.
Record-key grammar failures arrive as `invalid_key` wrappers whose useful
message (e.g. the `_` hint) lives in the nested issues, so those are
surfaced instead of Zod's generic "Invalid key in record".

<!-- /signature -->

Formats every issue of a `ZodError` as one `path → message` line. See [Report validation errors](../cookbook.md#report-validation-errors).
