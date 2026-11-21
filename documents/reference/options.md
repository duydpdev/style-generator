# Options

`StyleGeneratorOptions`: the second argument of `generate()` and, as JSON keys, the generator options of `style-gen.config.json`, the file the CLI and both bundler plugins read. The config file also accepts `"$schema": "./style-gen.config.schema.json"` (written by `style-gen schema`) so editors autocomplete its keys; see [CLI](./cli.md#configuration-file).

`generate(theme, options)` takes `StyleGeneratorOptions`; every key below is also valid in `style-gen.config.json`:

| Option                    | Type                                                                                      | Default                      | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| :------------------------ | :---------------------------------------------------------------------------------------- | :--------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `breakpoints`             | `readonly (Breakpoint \| string)[]`                                                       | `["md", "lg"]`               | Breakpoints for responsive `@source inline` variants, spacing fallback chains and `DesignTokens.Web.breakpoints`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `screens`                 | `Record<string, string>`                                                                  | `defaultScreens`             | Custom screen widths (emitted as `@theme { --breakpoint-* }`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `enableResponsive`        | `boolean`                                                                                 | `true`                       | Generate responsive spacing fallback chains.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `spacing.enabled`         | `boolean`                                                                                 | `true`                       | Emit the `.sp-*` utilities.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `spacing.properties`      | `SpacingPropertyMap`                                                                      | `DEFAULT_SPACING_PROPERTIES` | Replace the spacing key → CSS properties map (`{ p: ["padding"] }`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `typography.cssVarDriven` | `boolean`                                                                                 | `false`                      | Emit `--typography-<name>-<prop>` variables in `:root` and reference them from each typography utility, so a single token can be overridden in CSS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `coverage`                | `Partial<Record<CategoryKey, boolean \| CoverageRule>>` (`colors` also takes `opacities`) | all categories fully covered | Trim a category's `@source inline` lines (`false`, `{ prefixes }`, `{ keys: "aliased" }`) or add the opacity-modifier classes of colors (`{ opacities }`). See [`coverage`](#coverage-trim-the-source-inline-lines-per-category).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `resetTailwindDefaults`   | `readonly ("colors" \| "radius" \| "shadow")[]`                                           | `[]`                         | Clear Tailwind's built-in default namespaces so only the theme's tokens exist. Each name adds `--color-*: initial;`, `--radius-*: initial;` or `--shadow-*: initial;` as the **first** lines of `@theme inline`. `"colors"` also removes `--color-white`/`--color-black` (declare them in `colors` if you use them); static utilities such as `rounded-full`, `rounded-none`, `shadow-none` and the `inset-`/`drop-`/`text-shadow` families are untouched. Each name needs a non-empty replacement in the theme: `"colors"` requires `colors` (non-empty), `"radius"` a `borderRadius` and `"shadow"` `shadows` (`generate()` throws `resetTailwindDefaults.<i>` otherwise: clearing the defaults with no replacement would make `bg-red-500`/`rounded-md`/`shadow-md` compile to nothing). Duplicates and order do not change the output. |

### Config-only keys

These keys exist in `style-gen.config.json` only; `generate()` rejects them in its options argument.

| Key            | Type     | Default                           | Description                                                                                                          |
| :------------- | :------- | :-------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `theme`        | `string` | `styles/theme.json`               | Theme JSON path, relative to the project root. It may point outside the project (a shared design-system package).    |
| `output`       | `string` | `styles/theme.css`                | Generated CSS path, relative to the project root; must stay inside it.                                               |
| `tokensOutput` | `string` | `theme.tokens.ts` beside `output` | Generated tokens module (`.ts`, `.mts` or `.cts`, not a `.d.ts`), relative to the project root; must stay inside it. |
| `$schema`      | `string` | none                              | Editor pointer to `style-gen.config.schema.json`; accepted in the file, dropped on read, never reaches `generate()`. |

### Default screens

`screens` is merged over Tailwind's default screens; these are the values when `screens` is unset (`defaultScreens`, exported from `./tokens`):

| Key   | Width    |
| :---- | :------- |
| `sm`  | `640px`  |
| `md`  | `768px`  |
| `lg`  | `1024px` |
| `xl`  | `1280px` |
| `2xl` | `1536px` |

### One example per key

Each fragment is a valid `style-gen.config.json` on its own.

`breakpoints`: responsive variants to cover (`md`, `lg` when unset):

```json
{ "breakpoints": ["md", "lg", "xl"] }
```

`screens`: change a width or add a screen (all values must share one unit with the defaults):

```json
{ "screens": { "md": "800px", "3xl": "1920px" }, "breakpoints": ["md", "3xl"] }
```

`enableResponsive`: skip the responsive spacing fallback chains:

```json
{ "enableResponsive": false }
```

`spacing`: replace the key → CSS properties map (`spacing.enabled: false` turns the `.sp-*` utilities off):

```json
{ "spacing": { "properties": { "p": ["padding"], "gap": ["gap"] } } }
```

`typography`: reference `--typography-<name>-<prop>` variables from each typography utility:

```json
{ "typography": { "cssVarDriven": true } }
```

`coverage`: trim the `@source inline` lines (see [`coverage`](#coverage-trim-the-source-inline-lines-per-category)):

```json
{
  "coverage": {
    "colors": { "prefixes": ["bg", "text"], "keys": "aliased" },
    "shadows": false
  }
}
```

`resetTailwindDefaults`: clear Tailwind's built-in namespaces:

```json
{ "resetTailwindDefaults": ["colors", "radius", "shadow"] }
```

`theme`, `output`, `tokensOutput` and `$schema`:

```json
{
  "$schema": "./style-gen.config.schema.json",
  "theme": "src/theme/theme.json",
  "output": "src/theme/theme.css",
  "tokensOutput": "src/theme/theme.tokens.ts"
}
```

### `resetTailwindDefaults`: keep only the theme's tokens

Tailwind keeps its own color scale, `rounded-*` and `shadow-*` next to the theme's tokens. Name a namespace in `resetTailwindDefaults` to clear it:

```ts
import { generate } from "@duydpdev/style-generator";
import theme from "./theme.json";

generate(theme, { resetTailwindDefaults: ["colors", "radius", "shadow"] });
```

Each name adds its `initial` line at the start of the `@theme inline` block. `style-gen doctor` reports a name without its replacement in the theme, the same error `generate()` throws.

### Classes built at runtime

Class names built at runtime (a template literal such as `` `bg-${variant}` ``) are invisible to Tailwind's static scan. The generator has no option for them: declare them in your own CSS, next to the generated import, with a plain Tailwind directive:

```css
@import "tailwindcss";
@import "./theme.css";
@source inline("hover:bg-{primary,secondary}");
```

Any other key is unknown and makes `generate()` throw a `ZodError` (`unrecognized_keys`).

`generate()` validates every option that reaches the CSS and throws a `ZodError` naming its path: unknown option keys (also inside `spacing` and `typography`) are rejected; `enableResponsive`, `spacing.enabled` and `typography.cssVarDriven` must be booleans; `breakpoints` entries, `screens` and `spacing.properties` keys follow the theme key grammar (letters, digits, `-`); `screens` values must be one length in px, rem or em, and the map merged with the px `defaultScreens` must use a single unit (reported at `screens`); every `breakpoints` entry must name a screen in `defaultScreens` or `screens` (reported at `breakpoints.<i>`); the CSS property names inside `spacing.properties` must be lowercase (`padding`, `column-gap`, `--custom`).

### `coverage`: trim the `@source inline` lines per category

By default every category gets a `@source inline` line covering all its keys (and every `bg-`/`text-`/`border-`/`ring-`/`outline-`/`divide-`/`placeholder-` prefix for colors). That is the safe default, but a large palette makes the line big. `coverage` trims it, per category (`colors`, `typography`, `shadows`, `backdropBlurs`, `borderRadius`, `fontFamily`, `borderWidth`):

| `coverage.<category>`     | Effect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| absent, `true`, `{}`      | Today's output, byte for byte.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `false`                   | No `@source inline` line for the category, and none of its state lines (`hover:`, `active:`).                                                                                                                                                                                                                                                                                                                                                                                                           |
| `{ prefixes: [...] }`     | Keep only the listed class prefixes (`bg`, `rounded-t`, …). Each must be a prefix of that category, else `generate()` throws; typography has no prefixes (its keys are the class names).                                                                                                                                                                                                                                                                                                                |
| `{ keys: "aliased" }`     | Keep only the keys whose value is a `"$<key>"` alias (the alias holders), in the base record or in any `themeAxes` override. The primitives they point to need no class. The state lines follow: `hover:bg-x-hover` survives only when both `x` and `xHover` do. Not allowed for `typography` (no aliases).                                                                                                                                                                                             |
| `{ keys: "all" }`         | The default: every key.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `{ opacities: [10, 20] }` | `colors` only. One extra line, `{bg,text,border,ring,outline,divide,placeholder}-{<keys>}/{10,20}`, right after the colors line: the same prefixes and keys (it follows `prefixes` and `keys`) with Tailwind's `/<n>` opacity modifier, so `bg-primary/10` exists even when no source file names it. Distinct integers 1–100, non-empty; emitted ascending. Not crossed with the state lines (`hover:bg-primary-hover/10` is not covered). Any other category throws (`coverage.<category>.opacities`). |

`prefixes`, `keys` and `opacities` combine; `prefixes` and `opacities` lists must be non-empty. With `keys: "aliased"` and no alias holder in the category (or no declared keys at all), nothing is emitted: the built-in defaults are never aliases. `coverage` only changes `@source inline`: `@theme inline`, `@utility` blocks and the typed `DesignTokens` are unchanged (except `DesignTokens.Web.opacities`, which lists the plain `opacities` steps), so a class you still use that is no longer covered must appear literally in your source or in your own `@source inline(...)` (see [Classes built at runtime](#classes-built-at-runtime)).

```ts
import { generate } from "@duydpdev/style-generator";
import theme from "./theme.json";

generate(theme, {
  coverage: {
    colors: { prefixes: ["bg", "text"], keys: "aliased" },
    borderRadius: { prefixes: ["rounded"] },
    shadows: false,
  },
});
```

`@source inline` forces every listed class into the build whether or not it is used, so `coverage.colors.opacities` grows **your** stylesheet by `prefixes × keys × steps` classes. The default covers seven color prefixes (`bg`, `text`, `border`, `ring`, `outline`, `divide`, `placeholder`), so the cost scales with `prefixes`: trim it to what you use, for example `prefixes: ["bg"]` with `keys: "aliased"`, and track your own CSS with [`style-gen budget`](./cli.md#style-gen-budget). A class with an opacity that is not in the list still works when it appears literally in a scanned source file.

```ts
import { generate } from "@duydpdev/style-generator";
import theme from "./theme.json";

generate(theme, {
  coverage: {
    colors: { prefixes: ["bg"], keys: "aliased", opacities: [10, 20] },
  },
});
```

**Opacity groups.** One `bg-foreground/32` should not cost a whole `prefixes × keys` line. Next to the plain steps, an `opacities` entry may be a group `{ steps, prefixes?, keys? }`: it adds one further `@source inline` line for its own steps only, after the plain-step line, in declaration order. `steps` is a non-empty list of distinct integers 1–100 (emitted ascending). `prefixes` (non-empty, each a `colors` prefix) and `keys` (non-empty, each a key of `theme.colors`) default to the prefixes and keys the rule covers. A `prefixes` entry that is not a `colors` prefix throws at `coverage.colors.opacities.<i>.prefixes.<j>`, a `keys` entry that is not a theme color throws at `coverage.colors.opacities.<i>.keys.<j>` (`Unknown color key "…" in an opacity group`), and an unknown member or an empty list throws too. Options without a group emit the same CSS as before. A step that is both a plain step and part of a group covers the same class twice, and two identical groups repeat the same `@source inline` line; Tailwind builds each class once. `DesignTokens.Web.opacities` lists the plain steps only: a group names its own prefixes and keys, which need not match the rule's, so `createVariantMapper` does not offer `foreground/32` as a key, and the class is written as a literal where it is used.

```ts
import { generate } from "@duydpdev/style-generator";
import theme from "./theme.json";

generate(theme, {
  coverage: {
    colors: {
      prefixes: ["bg", "text", "border"],
      opacities: [
        5,
        10,
        { steps: [32], prefixes: ["bg"], keys: ["foreground"] },
      ],
    },
  },
});
```

This emits `{bg,text,border}-{<keys>}/{5,10}` and then `{bg}-{foreground}/{32}`, so `bg-foreground/32` exists without the full line that one more plain step would add.

### JSON Schema limits

`style-gen schema` writes the JSON Schema of `style-gen.config.json`, and an editor that reads it through `"$schema"` flags a wrong key or value as you type. The schema carries the key and value rules its generator maps into it: the accepted keys, the value shapes, and, for each `coverage` category, only its own `prefixes` (none for `typography`), `opacities` as distinct integers or groups whose `prefixes` are `colors` prefixes (only for `colors`) and `keys: "aliased"` only where `$` aliases exist. A committed schema file keeps the keys of the version that wrote it: run `yarn style-gen schema` after upgrading the package.

It cannot state a rule that compares two keys, reads another file or constrains a path, so an editor can accept a config that `generate`, `style-gen doctor` and the bundler plugins reject:

- every `breakpoints` entry must name a screen in `defaultScreens` or `screens`;
- `screens`, merged with the default screens, must use one unit;
- each `resetTailwindDefaults` name needs its replacement category in the theme;
- `output` and `tokensOutput` stay inside the project root, `tokensOutput` is a `.ts`, `.mts` or `.cts` file (the schema types it as a string and states no extension), and the theme, the CSS, the tokens module, `style-gen.config.json` and `package.json` are different files.

The descriptions of `breakpoints` and `screens` in the schema say so. Run `yarn style-gen doctor` to get the full verdict.
