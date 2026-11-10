# design-system-example

The shared design system behind the `harness` example: one theme, one options object, typed tokens, a `cn()` helper, the headless recipes of the six sample components and the shared CSS. The app keeps only its wiring, its demo code and the six sample components in its own `ui/` folder; everything else lives here.

This is a private Yarn workspace of the repo root (`"design-system-example": "workspace:*"` in the apps). It depends on the library through `"@duydpdev/style-generator": "link:../.."`, so the library must be built first.

## Prerequisites

```bash
# From the repo root
yarn install
yarn build:all   # lib (dist/) + CLI (dist/cli/index.mjs, used by `generate`, `doctor`, `schema` and the DX test)
```

**Node >= 22.18 is required to run the examples.** The app's bundler config (`vite.config.ts`) imports `design-system-example/style-gen.options`, a `.ts` file inside a workspace package, and Node loads it through its built-in type stripping. There are no `postinstall` / `prepare` hooks in any example.

## What is in here

```text
examples/design-system
├── package.json            exports: ".", "./style-gen.options", "./theme.json", "./styles/*"
├── style-gen.config.json   CLI mirror of `options` (pinned equal by tests/dx.test.ts)
├── src/
│   ├── theme.json          source of truth ("$schema" → theme.schema.json)
│   ├── theme.schema.json   `yarn schema`
│   ├── theme.alt.json      second theme, no key shared with theme.json
│   ├── style-gen.options.ts  `options` — `as const satisfies StyleGeneratorOptions`, dependency-free
│   ├── tokens.ts           `theme`, `Theme`, `tokens` (createDesignTokens from the browser-safe /tokens subpath)
│   ├── cn.ts               cn = createCn(tokens) from the /ui subpath
│   ├── axes.ts             `axisAttributes()` — the `data-*` attributes of the active themeAxes
│   ├── alt.ts              the factories bound to theme.alt.json (not exported from index.ts)
│   ├── recipes/            box, text, stack, grid, button (bound) + factories/ (theme-free)
│   ├── styles/             palettes.css (dark × palette), style-guide.css (bespoke chrome)
│   └── index.ts            the public surface of the package
└── tests/
    ├── dx.test.ts          compiler-API test + options ≡ style-gen.config.json
    ├── alt.test.ts         the alt theme through the unchanged factories (snapshot)
    └── dx.test-d.ts        type assertions (`expectTypeOf`)
```

Nothing under `src/` imports the library root (`@duydpdev/style-generator`): that entry carries the Zod schemas, and these modules run in the browser. They use the subpaths `/tokens`, `/cva`, `/recipes`, `/ui` and `/types` only; the factories build their recipes with `recipeFromTables` from `/ui`.

### The recipes

Each recipe is a headless `cva` configuration, built with `createVariantMapper` and `COLOR_STATES` from `@duydpdev/style-generator/cva`. A framework component only adds markup:

```tsx
// harness: a thin wrapper
import { buttonRecipe, cn } from "design-system-example";

export const Button = ({ variant, color, size, className, ...props }) => (
  <button
    className={cn(buttonRecipe({ variant, color, size }), className)}
    {...props}
  />
);
```

| Recipe         | Variants                                                                                                                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buttonRecipe` | `variant` (fill, outline, soft, ghost, link) × `color` (`Intent`) × `size`                                                                                                                                                                                                    |
| `stackRecipe`  | `direction`, `align`, `justify`, `wrap`, `divideColor` (gap = a spacing prop). Flex adds `grow`, `shrink`, `basis` through `createFlexRecipe` (`design-system-example/recipes`)                                                                                               |
| `gridRecipe`   | `align`, `justify`, `flow`, `rows` (columns = `gridColumns` from `design-system-example/recipes`: a count, a CSS track list or a breakpoint record)                                                                                                                           |
| `textRecipe`   | `type` (typography), `color` (a token or `token/step`), `decoration`, `align`, `transform`, `italic`, `truncate`, `lineClamp`, `wrap`                                                                                                                                         |
| `boxRecipe`    | `backgroundColor`, `borderColor`, `ringColor`, `outlineColor`, `border*`, `rounded*`, `shadow`, `backdropBlur`, `position`, `display`, `overflow`, `zIndex`, `opacity`, `cursor`, `pointerEvents`, `select`, `transition`, `aspect`, `objectFit`, `visibility`, `innerBorder` |

Spacing is not a variant. Split the responsive spacing props off with the library helper and merge the result:

```tsx
const { spacing, rest } = splitSpacingProps(props, tokens.spacingProperties);
<div
  {...rest}
  className={cn(boxRecipe(variants), spacing.className, className)}
  style={{ ...spacing.style, ...style }}
/>;
```

`BoxSpacingProps` is typed by `options.breakpoints`: `{ md: 4 }` compiles, `{ xl: 4 }` does not.

### Theme axes

`theme.json` declares two independent `themeAxes`, `theme` (dark, highContrast) and `palette` (forest, sunset, mono), each switched through `<html data-*>`. `axisAttributes({ theme: "highContrast", palette: "forest" })` returns `{ "data-theme": "high-contrast", "data-palette": "forest" }` (variants are kebab-cased; `"base"` or an omitted axis emits nothing). The `theme` axis is declared before `palette`, so for a token both override, the palette wins.

Not every override is generated from `theme.json`:

| Axis (source)                                                                    | Content                                                                                | Handling                                                                                                                                                                                         |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `theme` (`theme.json` → `themeAxes.theme.{dark,highContrast}`)                   | override `--sg-*` colors (+ shadows for dark)                                          | Generated by the library — `html[data-theme="dark\|high-contrast"]`                                                                                                                              |
| `palette` (`theme.json` → `themeAxes.palette.{forest,sunset,mono}`)              | override `--sg-*` colors                                                               | Generated by the library — `html[data-palette="forest\|sunset\|mono"]`                                                                                                                           |
| compound `[data-theme="dark\|high-contrast"][data-palette="…"]` (`palettes.css`) | cross-axis override (dark or high contrast × a specific palette)                       | Stays hand-written CSS: a single `ThemeOverride` can't target two axes' attributes at once; its (0,2,0) specificity still beats either single-axis `html[data-…]` rule (0,1,1) the library emits |
| `voice`, `geometry`, `surface` (`style-guide.css`)                               | `--f-sans`, `--radius-sm`, `--shadow-sm`, and a nested `.x-sg-glass-target` child rule | Stays hand-written CSS: variables outside `--sg-*` and a nested-child selector aren't representable by a `ThemeOverride`                                                                         |

## How the apps wire it

Each app emits its own gitignored `theme.css` through the bundler plugin, importing the shared `options`:

```ts
import { options } from "design-system-example/style-gen.options";

styleGenVite({
  themePath: "../design-system/src/theme.json",
  outDir: "src/theme",
  options,
});
```

and its global stylesheet imports the shared CSS and scans the design system for class names (`@source` is relative to the CSS file):

```css
@import "tailwindcss";
@import "./theme/theme.css";
@import "design-system-example/styles/palettes.css";
@import "design-system-example/styles/style-guide.css";
@source "../../design-system/src";
```

## CLI-only flow (no bundler plugin)

`style-gen.config.json` mirrors `options` for projects that generate the CSS from the CLI instead of a plugin. Run it before the dev server and the build, with `--watch` while developing:

```jsonc
// package.json of a consuming project
{
  "scripts": {
    "generate": "style-gen generate",
    "dev": "yarn generate && (style-gen generate --watch & vite)",
    "build": "yarn generate && vite build",
  },
}
```

Here the same thing is available as scripts (they run `dist/cli/index.mjs`, so build the library first):

```bash
yarn workspace design-system-example generate   # src/theme.json → src/styles/theme.css (gitignored)
yarn workspace design-system-example doctor     # checks the config and theme.json
yarn workspace design-system-example schema     # rewrites src/theme.schema.json
```

## Tests

```bash
yarn build:all                                   # the tests need the library's dist/*.d.ts
yarn workspace design-system-example typecheck
yarn workspace design-system-example test        # vitest run --typecheck
```

- `tests/dx.test.ts` type-checks `src/recipes/button.ts` with the TypeScript compiler API. The shipped theme must produce no diagnostic; with `danger` renamed to `dangerX` in `theme.json` (served through `host.getSourceFile`) it must produce at least one, located in `src/recipes/button.ts` — the `intents` tuple is the anchor. It also pins `style-gen.config.json` (minus `$schema`/`theme`/`output`) to `options` and runs `generate()` on the theme.
- `tests/dx.test-d.ts` asserts the `Intent` union, the `md | lg` breakpoint keys, that `{ xl: 4 }` is rejected and the shape of `axisAttributes`.
