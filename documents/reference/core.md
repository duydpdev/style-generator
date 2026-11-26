# Core API (@duydpdev/style-generator)

The root barrel `@duydpdev/style-generator`: `generate()`, the theme and options helpers, `formatZodError` and the types. The typed tokens, CVA and spacing helpers live on `./tokens`, `./cva` and `./spacing`, not on the root. It pulls in Zod, so use a subpath in browser code.

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
import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import {
  createVariantMapper,
  COLOR_STATES,
} from "@duydpdev/style-generator/cva";
import { resolveSpacing } from "@duydpdev/style-generator/spacing";

// Component-side recipes (no Zod; tailwind-merge stays your own dependency)
import {
  createTailwindMergeExtension,
  splitSpacingProps,
  themeAxisAttributes,
} from "@duydpdev/style-generator/recipes";

// Styleless component kit (class-variance-authority, clsx, tailwind-merge are your own dependencies)
import { createCn, splitLayout } from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import type {
  ThemeConfig,
  ColorVariant,
} from "@duydpdev/style-generator/types";

// Build-tool integrations (Node only)
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { styleGenNext } from "@duydpdev/style-generator/next";
```

Requires `tsconfig.json#compilerOptions.moduleResolution` = `"bundler"`, `"node16"`, or `"nodenext"`; **`"node10"` (the legacy `"node"`) is unsupported**: the package has no `typesVersions`, so the subpaths do not resolve there. The ESM and CJS builds each ship their own declaration file (`.d.ts` for `import`, `.d.cts` for `require`), so a CommonJS consumer under `node16`/`nodenext` resolves types instead of hitting the "masquerading as ESM" mismatch (`yarn check:types-pack` verifies it with `@arethetypeswrong/cli`). `dist/*.d.cts` is its `.d.ts` with one rewrite: the `vite` import becomes a type-only `import type { Plugin } from 'vite' with { 'resolution-mode': 'import' }`, because Vite has no usable CommonJS types (5/6 ship an `export = any` stub, 7/8 are ESM-only). The `types@<5.3` condition of `./vite` points at `dist/vite.legacy.d.cts`, which keeps the `assert` spelling for TypeScript before 5.3. `yarn typecheck:dist` type-checks the `.d.cts` as a CommonJS consumer (`module: node16`, `skipLibCheck: false`). On TypeScript 5.0–5.2 that one `assert` line is reported (`TS4125`) when a CommonJS consumer sets `skipLibCheck: false`; `skipLibCheck: true`, the default in most setups, and TypeScript >= 5.3 are unaffected. See [`documents/migration/3.x-subpath-exports.md`](../migration/3.x-subpath-exports.md) for the background.

## All exports by subpath

| Export                                                                                                                                                                                                                                                                        | Subpath                   | Description                                                                                                                                                                                                                 |
| :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate`                                                                                                                                                                                                                                                                    | `.`                       | **Main entry.** Returns `{ css, tokens, schema }` from a Zod-validated theme.                                                                                                                                               |
| `defineTheme`, `defineOptions`                                                                                                                                                                                                                                                | `.`                       | Type-safe helpers; `defineTheme` also validates at runtime.                                                                                                                                                                 |
| `formatZodError`                                                                                                                                                                                                                                                              | `.`                       | Formats a `ZodError` thrown by `generate()`/`defineTheme()` as one `path → message` line per issue.                                                                                                                         |
| `generateThemeCss`                                                                                                                                                                                                                                                            | `.`                       | Just `:root` variables, axis overrides and `@theme inline`; validates the theme (and the optional second-argument `options`, of which only `resetTailwindDefaults` matters) like `generate()`.                              |
| `createDesignTokens`                                                                                                                                                                                                                                                          | `./tokens`                | Typed `DesignTokens.Web.*`.                                                                                                                                                                                                 |
| `createVariantMapper`, `COLOR_STATES`, `toKebabCase`                                                                                                                                                                                                                          | `./cva`                   | Token keys → class names for CVA, optional `{ states }`; `toKebabCase` is the function the registry and mapper use.                                                                                                         |
| `resolveSpacing`                                                                                                                                                                                                                                                              | `./spacing`               | One spacing prop → `{ className, style }`.                                                                                                                                                                                  |
| `createTailwindMergeExtension`, `splitSpacingProps`, `themeAxisAttributes`, `SpacingProps`, `TailwindMergeExtension`, `TailwindMergeTokens`                                                                                                                                   | `./recipes` (not in `.`)  | Component-side recipes, see [Recipes](./recipes.md).                                                                                                                                                                        |
| `recipeFromTables`, `pick`, `contrastText`, `createCn`, `splitSpacing`, `splitLayout`, `mergeStyle`, `RecipeTokens`, `VariantTable`, `RecipeTables`, `RecipeProps`, `RecipeFn`, `RecipeVariantProps`, `SplitLayoutOptions`, `Cn`, `StyleRecord`, `Split`, `ThemeSpacingProps` | `./ui` (not in `.`)       | Styleless component kit, see [UI kit](./ui.md).                                                                                                                                                                             |
| `Polymorphic`                                                                                                                                                                                                                                                                 | `./ui-react` (types only) | Polymorphic `as` props for React components, see [React types](./ui-react.md).                                                                                                                                              |
| `styleGenVite`                                                                                                                                                                                                                                                                | `./vite`                  | Vite plugin writing `theme.css`.                                                                                                                                                                                            |
| `styleGenNext`                                                                                                                                                                                                                                                                | `./next`                  | Next.js config wrapper writing `theme.css`.                                                                                                                                                                                 |
| `Breakpoint`, `defaultScreens`                                                                                                                                                                                                                                                | `./tokens`                | `Breakpoint` const + type and default widths.                                                                                                                                                                               |
| `DEFAULT_ROUNDED_VALUES`, `DEFAULT_BORDER_VALUES`                                                                                                                                                                                                                             | `./tokens`                | Fallback values for `borderRadius` / `borderWidth`.                                                                                                                                                                         |
| `DEFAULT_SPACING_PROPERTIES`                                                                                                                                                                                                                                                  | `./spacing`               | Default spacing key → CSS properties map.                                                                                                                                                                                   |
| `roundedProperties`, `borderProperties`                                                                                                                                                                                                                                       | `./tokens`                | Class-prefix lists of the `borderRadius` / `borderWidth` categories.                                                                                                                                                        |
| Types: theme & options                                                                                                                                                                                                                                                        | `./types`, `.`            | `ThemeConfig`, `ThemeOverride`, `TypographyConfig`, `StyleGeneratorOptions`, `ExactOptions`, `CoverageRule`, `SpacingPropertyMap`, `CategoryKey`.                                                                           |
| Types: tokens & inference                                                                                                                                                                                                                                                     | `./types`, `.`            | `DesignTokensResult`, `DesignTokensWeb`, `CategoryTokenKey`, `InferBorderWidthOptions`, `InferRoundedOptions`, `InferSpacingKeys`, `BreakpointKeys`, `SpacingKeys`, `ScreenKeys`, `OpacitySteps`, `CamelCase`, `KebabCase`. |
| Types: variants                                                                                                                                                                                                                                                               | `./types`, `.`            | `DesignTokenKeys`, `ColorVariant`, `TextVariant`, `ShadowVariant`, `BackdropBlurVariant`, `FontFamilyVariant`, `BorderWidthVariant`, `RoundedVariant`.                                                                      |
| Types: theme axes                                                                                                                                                                                                                                                             | `./types`, `.`            | `ThemeAxisName`, `ThemeAxisVariant`, `ThemeAxesState`.                                                                                                                                                                      |
| Types: responsive spacing                                                                                                                                                                                                                                                     | `./types`                 | `ResponsiveValueStrict`, `DefaultBreakpointKeys`.                                                                                                                                                                           |
| Types: default values                                                                                                                                                                                                                                                         | `./types`                 | `SpacingKey`, `DefaultBorderValue`, `DefaultRoundedValue`.                                                                                                                                                                  |
| Types: `GenerateResult`                                                                                                                                                                                                                                                       | `.` (not in `./types`)    | Return type of `generate()`.                                                                                                                                                                                                |

## Peer dependencies

Peer dependencies (`typescript`, `vite` and the four UI-kit peers are optional: install them only if you type-check against the package, use `styleGenVite`, or import `./ui`/`./ui-react`):

| Peer                       | Range                                   | Tested in CI                      | Notes                                                                                                             |
| -------------------------- | --------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `node`                     | `^20.19.0 \|\| >=22.12.0`               | 20.19.0 (built-package smoke), 22 | Unflagged `require(esm)`, so the CJS entries can load the ESM-only `chokidar@5`.                                  |
| `tailwindcss`              | `^4.1.0`                                | 4.1.x, 4.3.5                      | Tailwind v3 is not supported. `@source inline(...)` needs 4.1+.                                                   |
| `typescript`               | `^5 \|\| ^6 \|\| ^7` (optional)         | 5.9, 6.x, 7.x (scratch project)   | For type-checking against the package's `.d.ts`. TypeScript 7 (native port) type-checks against the declarations. |
| `vite`                     | `^5 \|\| ^6 \|\| ^7 \|\| ^8` (optional) | 5.4, 6.4, 7.3, 8.3                | Only for `styleGenVite` (also used by Nuxt).                                                                      |
| `class-variance-authority` | `^0.7.0` (optional)                     | lockfile version                  | Only for `./ui` (`recipeFromTables`).                                                                             |
| `clsx`                     | `^1.2.0 \|\| ^2.0.0` (optional)         | lockfile version                  | Only for `./ui` (`createCn`, the `ClassValue` type).                                                              |
| `tailwind-merge`           | `^3.0.0` (optional)                     | lockfile version                  | Only for `./ui` (`createCn`); `./recipes` never imports it.                                                       |
| `@types/react`             | `^18.0.0 \|\| ^19.0.0` (optional)       | lockfile version                  | Only for the `./ui-react` types.                                                                                  |

> [!WARNING]
> npm 7 and later still fail with `ERESOLVE` when your dependency tree already holds an off-range copy of an optional peer (`class-variance-authority`, `clsx`, `tailwind-merge`, `@types/react`), even if the app never imports `./ui` or `./ui-react`. Align that dependency with the range above, or install with `--legacy-peer-deps`.

CI runs the latest release of each major in "Tested in CI"; the floor of a range (for example `vite@5.0.0`) is not tested. The `unit` and `dist-checks` jobs of `ci.yml` cover the lockfile versions (Vite 8.x, TypeScript 5.9). The `peer-matrix` job covers Vite 5, 6, 7 and 8 and TypeScript 6: it builds `examples/harness`, runs a Vite dev server that re-emits on a theme edit, and type-checks the example and `dist/*.d.ts`. A failing leg for a published major fails CI. The `ts-peer` job covers the TypeScript majors in a scratch npm project (see [`documents/testing.md`](../testing.md)).

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

Validate options, then the theme; return the Tailwind v4 CSS, typed tokens and theme JSON Schema.
`generate()` with `options`, whose literal keys type `tokens`.

<!-- /signature -->

Compiles a validated theme into `{ css, tokens, schema }`. The theme is described in [Theme config](./theme.md) and the second argument in [Options](./options.md).

`css` is one file to `@import` next to `@import "tailwindcss"`: no `@plugin`, no safelist file. `tokens` is the typed `DesignTokens.Web` key lists ([Design tokens](./tokens.md)); `schema` is the theme's JSON Schema. `generate()` writes nothing itself: `style-gen generate` and the bundler plugins call it and write `theme.css` and the typed `theme.tokens.ts` module, which you commit and import `tokens` from. A script that skips both writes `css` on its own:

```ts
import { writeFileSync } from "node:fs";
import {
  generate,
  defineTheme,
  defineOptions,
} from "@duydpdev/style-generator";
import themeJson from "./theme.json";

const theme = defineTheme(themeJson); // type-checked and validated at runtime
const options = defineOptions({ breakpoints: ["md", "lg"] });

const { css, tokens, schema } = generate(theme, options);
writeFileSync("styles/theme.css", css, "utf8");
```

## `generateThemeCss`

<!-- signature: generateThemeCss -->

```ts
export declare const generateThemeCss: (
  config: ThemeConfig,
  options?: StyleGeneratorOptions,
) => string;
```

Generates the `:root` `--sg-*` variables, one `html[data-<axis>="<variant>"]`
block per `themeAxes` variant, then `@theme inline`. Parses options, then the
theme, like `generate()`: invalid input throws a `ZodError`.

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

Validate a theme against `ThemeSchema` and keep its literal types.

<!-- /signature -->

Type-checks and validates a theme at runtime; it throws a `ZodError` for unknown keys or unsafe values. See [Theme config](./theme.md).

## `defineOptions`

<!-- signature: defineOptions -->

```ts
export declare function defineOptions<const O extends StyleGeneratorOptions>(
  options: ExactOptions<O>,
): O;
```

Type-only options helper: `const O` keeps the literal keys that type the tokens.

<!-- /signature -->

Type-safe options helper with no runtime cost; it keeps literal `breakpoints`, `screens` and `spacing.properties` keys. See [Options](./options.md).

## `formatZodError`

<!-- signature: formatZodError -->

```ts
export declare const formatZodError: (error: z.ZodError) => string;
```

Format every issue in a `ZodError` as one `"path → message"` line. Nested
`invalid_key` issues are surfaced instead of Zod's generic record-key message.

<!-- /signature -->

Formats every issue of a `ZodError` as one `path → message` line. See [Report validation errors](../cookbook.md#report-validation-errors).
