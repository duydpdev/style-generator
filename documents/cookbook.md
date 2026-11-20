# Cookbook

Task-sized recipes; each links to the reference page that owns the API.

## Generate the CSS without a bundler plugin

The CLI-only flow needs no bundler plugin: generate `theme.css` before the dev server and the build, and keep a watcher running during development:

```json
{
  "scripts": {
    "predev": "style-gen generate",
    "dev": "vite",
    "prebuild": "style-gen generate",
    "build": "vite build"
  }
}
```

```bash
yarn style-gen generate --watch   # second terminal: regenerates on every theme or style-gen.config.json edit
```

npm runs the `pre*` scripts automatically; Yarn Berry does not, so chain them there (`"dev": "style-gen generate && vite"`). `style-gen.config.json` carries the `theme`, `output` and generator options (`examples/design-system/style-gen.config.json` is a working one). Or call `generate()` yourself:

```ts
import { writeFileSync } from "node:fs";
import {
  generate,
  defineTheme,
  defineOptions,
} from "@duydpdev/style-generator";
import { Breakpoint } from "@duydpdev/style-generator/tokens";
import themeJson from "./theme.json";

const theme = defineTheme(themeJson); // type-checks AND validates at runtime
const options = defineOptions({ breakpoints: [Breakpoint.MD, Breakpoint.LG] });

const { css, tokens } = generate(theme, options);
writeFileSync("styles/theme.css", css, "utf8");
```

## Report validation errors

`defineTheme()` throws a `ZodError` with the offending path for unknown keys or unsafe values, and TypeScript rejects a missing `colors` at compile time. `formatZodError` turns that error into one `path → message` line per issue:

```ts
import { ZodError } from "zod";
import { generate, formatZodError } from "@duydpdev/style-generator";
import theme from "./theme.json";

try {
  generate(theme);
} catch (e) {
  if (e instanceof ZodError) console.error(formatZodError(e));
  throw e;
}
```

## Classes built at runtime

Class names built at runtime (a template literal such as `` `bg-${variant}` ``) are invisible to Tailwind's static scan; declare them in your own CSS, next to the generated import, with a plain Tailwind `@source inline("hover:bg-{primary,secondary}");` directive. See [Classes built at runtime](./reference/options.md#classes-built-at-runtime).

## Trim the generated `@source inline` lines

`coverage` drops a category's `@source inline` lines or keeps only some prefixes or the aliased keys, and `coverage.colors.opacities` adds the `bg-primary/10`-style classes; see [`coverage`](./reference/options.md#coverage-trim-the-source-inline-lines-per-category). `DesignTokens.Web.opacities` carries the same steps; pass it to `createVariantMapper(prefix, colors, { opacities })` to get `primary/10`-style keys (see [`createVariantMapper`](./reference/cva.md)).

## Dark mode toggle

A theme axis switches a set of tokens with one attribute on `<html>`; a small component sets it. Declare the axis in `theme.json`; each variant lists only the values that differ from the base theme:

```json
{
  "colors": { "background": "#FFFFFF", "foreground": "#111827" },
  "themeAxes": {
    "theme": {
      "dark": {
        "colors": { "background": "#0B0F19", "foreground": "#F9FAFB" }
      }
    }
  }
}
```

`style-gen generate` (or the plugin) emits `html[data-theme="dark"] { … }` and writes `ThemeAxesState` into `theme.tokens.ts`. `themeAxisAttributes` from `./recipes` turns that state into the attributes, so the component never spells the attribute name:

```tsx
import { themeAxisAttributes } from "@duydpdev/style-generator/recipes";
import { useEffect, useState } from "react";

import type { ThemeAxesState } from "./theme.tokens";

const DARK_STATE: ThemeAxesState = { theme: "dark" };

/** `{ "data-theme": "dark" }`; the base theme is the absence of the attribute. */
const DARK = themeAxisAttributes(DARK_STATE);

export function ThemeSwitch() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(DARK)) {
      if (dark) root.setAttribute(name, value);
      else root.removeAttribute(name);
    }
  }, [dark]);

  return (
    <button
      type="button"
      aria-pressed={dark}
      onClick={() => {
        setDark((on) => !on);
      }}
    >
      Dark mode
    </button>
  );
}
```

The CSS reads `data-theme` and the component writes the same attribute from the same formula, so the two cannot drift. Render the base theme on the server (no attribute) and apply the stored choice after hydration, so the first client render matches the server HTML. For Vue and Nuxt, [`examples/plain-nuxt/app/components/ThemeSwitch.vue`](../examples/plain-nuxt/app/components/ThemeSwitch.vue) does the same through `useHead({ htmlAttrs })`. See [Theme config → `themeAxes`](./reference/theme.md#multi-axis-theming-themeaxes).

## One theme shared by several apps (monorepo)

Keep `theme.json` in one package and let each app point at it:

```text
packages/theme/theme.json
apps/web/style-gen.config.json
apps/admin/style-gen.config.json
```

```json
{
  "theme": "../../packages/theme/theme.json",
  "output": "src/styles/theme.css",
  "tokensOutput": "src/styles/theme.tokens.ts"
}
```

`theme` may leave the app (a shared theme package); `output` and `tokensOutput` must stay inside the app root, so one app can never overwrite another's files. The plugin or `style-gen generate` in each app writes that app's own `theme.css` and `theme.tokens.ts`; commit the tokens file in each app, ignore the CSS. In CI run the check once per app:

```bash
yarn workspace web style-gen generate --check
yarn workspace admin style-gen generate --check
```

`--check` writes nothing and exits 1 when an app's `theme.tokens.ts` is missing or no longer matches the theme and config, so a theme edit that nobody regenerated fails the pipeline. See [CLI → `style-gen generate`](./reference/cli.md#style-gen-generate).

## Fail CI when the CSS grows

`style-gen budget` sums the gzip size of one `.css` file or of every `.css` file under a directory, so run it after the build:

```yaml
- run: yarn build
- run: yarn style-gen budget dist/assets --max-gzip 20000
```

Next.js writes its CSS to `.next/static/css`; use that directory instead of `dist/assets`. The exit code is the contract: `0` within budget, `1` over budget (`OVER BUDGET: …`), `2` for a usage error, an unreadable target or no `.css` file found, so a wrong path fails the step instead of passing silently. Set `--max-gzip` a little above today's size (the `OK: …` line prints it) and lower it when a trim such as `coverage` shrinks the file. See [CLI → `style-gen budget`](./reference/cli.md#style-gen-budget).

When the step fails, add `--coverage-cost` to see which theme class groups cost the most (it prints them after the summary line, with the `coverage` setting that removes each); apply the top suggestion in the config, rebuild, and run the budget again to measure the saving. The figure is an upper bound: classes your source uses stay.

## A component recipe from tables

A recipe is a function from variant props to a class string. Plain class tables go in, `recipeFromTables` (class-variance-authority underneath) returns the recipe, and `createVariantMapper` fills the tables from the theme's keys, so renaming a color in `theme.json` breaks the build instead of shipping a dead class:

```ts
import {
  COLOR_STATES,
  createVariantMapper,
} from "@duydpdev/style-generator/cva";
import { createCn, recipeFromTables } from "@duydpdev/style-generator/ui";

import { tokens } from "./tokens";

const cn = createCn(tokens);

const button = recipeFromTables({
  base: "inline-flex items-center font-medium",
  variants: {
    color: createVariantMapper("bg", tokens.colors, { states: COLOR_STATES }),
    radius: createVariantMapper("rounded", tokens.borderRadius),
  },
  defaultVariants: { color: "primary", radius: "md" },
});

export const className = cn(button({ color: "danger" }), "px-4");
```

`COLOR_STATES` chains `hover:` and `active:` classes onto a color that has `…Hover` and `…Active` siblings; `createCn(tokens)` makes a later `rounded-pill` replace an earlier `rounded-md`. `recipeFromTables` returns a typed recipe, so a misspelled variant value is a type error; leave the result un-annotated. See [UI kit](./reference/ui.md) and [Build components](./getting-started/build-components.md).
