# Theme config

The shape of the theme JSON that `generate()`, `defineTheme()` and the CLI validate; only `colors` is required.

`ThemeSchema` is a strict Zod schema: unknown keys, unsafe values and invalid references throw a `ZodError` with the offending path. `generate()`, `defineTheme()`, the CLI, `styleGenVite` and `styleGenNext` all validate independently.

## Minimal config

Only `colors` is required. Everything else is optional:

```ts
import { generate } from "@duydpdev/style-generator";

const { css } = generate({
  colors: { primary: "#3B82F6", background: "#FFFFFF" },
});
```

## Key grammar

Every token name, axis name and variant name must start with a letter or digit and then contain only letters, digits or `-`. In particular **`_` is rejected** — use camelCase such as `primaryActive` or kebab-case such as `primary-active` — because `_` would make the class name and the typed token disagree. The CLI, `styleGenVite` and `styleGenNext` print that hint on the offending path (`colors.primary_active → … use camelCase … or kebab-case …`). Two keys in one record that kebab-case to the same name (`blue500` and `blue-500`) are rejected too. Each category owns a distinct `--sg-<category>-` variable namespace (`--sg-color-*`, `--sg-shadow-*`, `--sg-sp-*`, …), so keys in different categories never collide (`colors.shadowPrimary` → `--sg-color-shadow-primary`, `shadows.primary` → `--sg-shadow-primary`). A `typography` key may not kebab-case to `sp-*` or `font-*`, and `fontWeight` must be a number from 1 to 1000. Values may not contain `;`, `{`, `}`, `<`, `@`, `\`, `/*` or a line break, quotes must be balanced, and so must parentheses and brackets (`rgb(0 0 0` is rejected at its path).

## Key rules

Everything the schema rejects about a name, in one place (every rule is reported as `path → message`):

| Rule                                                                                                                                                                                                                        | Applies to                                                                          | Rejected                                                            | Accepted                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------- |
| Start with a letter or digit, then only letters, digits or `-`                                                                                                                                                              | every token, axis and variant name                                                  | `-primary`, `my color`                                              | `primary`, `2xl`, `primary-active` |
| `_` is never allowed                                                                                                                                                                                                        | every token, axis and variant name                                                  | `primary_active`                                                    | `primaryActive`, `primary-active`  |
| No leading run of two or more uppercase letters: the class the typed tokens produce (`cTA` → `c-ta`) would differ from the class the CSS emits (`cta`). A single capital is fine                                            | every token, axis and variant name                                                  | `CTA`, `ABtn`, `HTMLParser` (rename to `cta`, `abtn`, `htmlparser`) | `Blue`, `primaryCTA`, `primaryFG`  |
| Keys of one record that kebab-case to the same name                                                                                                                                                                         | each category and `typography`                                                      | `blue500` + `blue-500`                                              | `blue500` + `blue600`              |
| A `typography` key must kebab-case to a valid Tailwind `@utility` name: lowercase letter first, so no leading digit or dash                                                                                                 | `typography`                                                                        | `2xl`, `12Mono`                                                     | `text2xl`, `heading1`              |
| `fontFamily` keys may not kebab-case to a Tailwind font-weight name (`thin`, `extralight`, `light`, `normal`, `medium`, `semibold`, `bold`, `extrabold`, `black`)                                                           | `fontFamily` (also in `themeAxes` overrides)                                        | `bold`, `extrabold`                                                 | `sans`, `display`                  |
| A `borderWidth` key may not kebab-case to a `colors` key (both emit `border-<key>`)                                                                                                                                         | `borderWidth` vs `colors`, per scope                                                | `colors.thinLine` + `borderWidth.thin-line`                         | `colors.line` + `borderWidth.thin` |
| A `typography` key may not kebab-case to `sp-*` or `font-*` (it would shadow the spacing and font utilities)                                                                                                                | `typography`                                                                        | `spBody`, `sp-body`, `fontBold`                                     | `body`, `spacious`                 |
| A `fontFamily` key may not kebab-case to `weight` / `size` or start with `weight-` / `size-` (Tailwind ignores `--font-weight-*` / `--font-size-*` as font families, so the key would overwrite the weight and size scales) | `fontFamily`                                                                        | `weightBold`, `size-xl`                                             | `weighty`, `sizeable`              |
| A `typography` key may not kebab-case to a class another category emits (`<prefix>-<key>`)                                                                                                                                  | `typography` vs `colors`, `borderWidth`, `shadows`, `borderRadius`, `backDropBlurs` | `textPrimary` next to `colors.primary`                              | `text12Mono`, `heading`            |
| Variants of one axis may not kebab-case to the same name (they would share one selector)                                                                                                                                    | `themeAxes.<axis>`                                                                  | `darkMode` + `dark-mode`                                            | `dark`, `highContrast`             |
| Axis and variant names may not be canonical integers                                                                                                                                                                        | `themeAxes`                                                                         | `100`, `2024`                                                       | `contrast100`, `007`               |

The CLI, `styleGenVite` and `styleGenNext` print the rename hint on the offending path (for example `colors.CTA → Key "CTA" yields class "cta" in the CSS but "c-ta" through the typed tokens; rename it to "cta" …`).

## Categories

| Theme key       | Generates                                                                                                                      | Notes                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `colors`        | `bg-*`, `text-*`, `border-*` via `@theme inline` (`--color-*`)                                                                 | Required. Flat, camelCase.                                                                                                                                                     |
| `typography`    | `@utility <kebab-key>` (`text16Medium` → `.text-16-medium`)                                                                    | Entry: `fontSize`, `lineHeight`, `fontWeight` (number, 1–1000), optional `letterSpacing`/`fontFamily`/`fontStyle`; an absent `letterSpacing` emits no declaration. No aliases. |
| `shadows`       | `shadow-*`                                                                                                                     |                                                                                                                                                                                |
| `backDropBlurs` | `backdrop-blur-*`                                                                                                              |                                                                                                                                                                                |
| `borderRadius`  | `rounded-*` (+ `md:`/`lg:` variants for the active breakpoints)                                                                | Falls back to `DEFAULT_ROUNDED_VALUES`.                                                                                                                                        |
| `fontFamily`    | `font-*` via Tailwind's `--font-*` namespace                                                                                   | Keys may not be Tailwind font-weight names (`bold`, `medium`, …).                                                                                                              |
| `borderWidth`   | `border`, `border-x/y/t/r/b/l/s/e`, `divide-x/y` via Tailwind's `--border-width-*` namespace (backed by `--sg-border-width-*`) | Falls back to Tailwind's own `0/1/2/4` scale when omitted or empty (`{}`). Replaces the 3.x `border` key.                                                                      |

## Colors — camelCase keys

Keys use **camelCase** (or kebab-case); the library converts them to kebab-case variables and classes. Nested objects and a `DEFAULT` key are not supported.

| Theme key           | CSS variable                 | Tailwind class            |
| ------------------- | ---------------------------- | ------------------------- |
| `primaryForeground` | `--color-primary-foreground` | `text-primary-foreground` |
| `sidebarForeground` | `--color-sidebar-foreground` | `bg-sidebar-foreground`   |
| `blue500`           | `--color-blue-500`           | `border-blue-500`         |
| `primary`           | `--color-primary`            | `text-primary`            |

> **Rule:** a letter→digit boundary adds a dash (`blue500` → `blue-500`). Digit-prefix values stay unchanged (`2xl` → `2xl`).

## Aliases (`$key`)

A value `"$<key>"` refers to another key **in the same category** and is emitted as `var(--<cssVarPrefix>-<kebab-key>)`, where the prefix belongs to the category (`sg-color` for `colors`, `sg-shadow` for `shadows`, `sg-backdrop-blur`, `sg-radius`, `sg-font`, `sg-border-width`):

```json
{
  "colors": { "blue500": "#3B82F6", "primary": "$blue500" },
  "shadows": { "base": "0 1px 2px rgb(0 0 0 / 0.1)", "card": "$base" }
}
```

The target is the raw key (`$blue500`, not `$blue-500`), it must exist, and the alias graph must be acyclic. Aliases are not allowed inside `typography`. The example above emits:

```css
:root {
  --sg-color-blue-500: #3b82f6;
  --sg-color-primary: var(--sg-color-blue-500);
  --sg-shadow-base: 0 1px 2px rgb(0 0 0 / 0.1);
  --sg-shadow-card: var(--sg-shadow-base);
}
```

## Interactive states (`primaryHover`, `primaryActive`)

Declare flat sibling keys next to a color and the registry emits the state utilities for them:

```json
{
  "colors": {
    "blue600": "#2563EB",
    "blue700": "#1D4ED8",
    "primary": "#3B82F6",
    "primaryHover": "$blue600",
    "primaryActive": "$blue700"
  }
}
```

`primary` now opts into `hover:bg-primary-hover` and `active:bg-primary-active` (and the `text-`/`border-` forms). The state list is the exported constant `COLOR_STATES` (`["hover", "active"]`); feed it to `createVariantMapper(prefix, tokens, { states: COLOR_STATES })` to get the class string, see [section 7](./cva.md). State names are kebab-cased (`focusVisible` → `focus-visible:`).

## Multi-axis theming (`themeAxes`)

`themeAxes` maps an **axis name** to its **variants**; each variant only lists the values that differ from the base. Several axes can be active at once:

```json
{
  "colors": {
    "primary": "#3B82F6",
    "background": "#FFFFFF",
    "foreground": "#111827"
  },
  "shadows": { "sm": "0 1px 2px rgba(0,0,0,0.1)" },
  "themeAxes": {
    "theme": {
      "dark": {
        "colors": {
          "primary": "#60A5FA",
          "background": "#111827",
          "foreground": "#F9FAFB"
        },
        "shadows": { "sm": "0 1px 2px rgba(255,255,255,0.1)" }
      }
    },
    "palette": {
      "forest": { "colors": { "primary": "#16A34A" } },
      "highContrast": { "colors": { "primary": "#000000" } }
    }
  }
}
```

Generated selectors (after `:root`, in declaration order):

```css
:root { --sg-color-primary: #3B82F6; … }
html[data-theme="dark"] { --sg-color-primary: #60A5FA; … }
html[data-palette="forest"] { --sg-color-primary: #16A34A; }
html[data-palette="high-contrast"] { --sg-color-primary: #000000; }
```

```html
<html data-theme="dark" data-palette="high-contrast">
  …
</html>
```

Rules:

- **Selectors are pinned to `html`.** A `data-*` attribute on a wrapper element has no effect. The reason is aliases: a `var()` alias resolves at the element that _declares_ the custom property (`:root`), so an override on any other element never reaches an alias's value.
- **Attribute values are the kebab form of the key**: variant `highContrast` → `data-palette="high-contrast"`; axis `colorScheme` → `data-color-scheme`.
- **Precedence is declaration order.** The selectors have equal specificity, so when two axes override the same token the axis declared **later** in the JSON wins.
- **Axis and variant names cannot be canonical integers** (`100`, `2024`): JavaScript enumerates integer-like keys first, which would silently break declaration order. Use `contrast100` instead.
- **A variant cannot be named `base`**: `"base"` is the "no override" value of `ThemeAxesState` and `themeAxisAttributes`, so a variant of that name could never be switched on. `ThemeSchema` rejects `themeAxes.<axis>.base`; name it `default` or `standard`. (An axis named `base` is fine.)
- **Override keys must already exist in the base** record; an override-only key would produce no utility and is rejected.
- **Compound overrides stay hand-written CSS.** A single override cannot target two axes' attributes at once:

| Axis (source)                                        | Content                                                                                            | Handling                                                                                                                                                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme` (`themeAxes.theme.dark`)                     | override `--sg-*` colors + shadows                                                                 | Generated by the library — `html[data-theme="dark"]`                                                                                                                                                 |
| `palette` (`themeAxes.palette.{forest,sunset,mono}`) | override `--sg-*` colors                                                                           | Generated by the library — `html[data-palette="forest\|sunset\|mono"]`                                                                                                                               |
| compound `[data-theme="dark"][data-palette="…"]`     | cross-axis override (dark × a specific palette)                                                    | Hand-written CSS: its `(0,2,0)` specificity beats either single-axis `html[data-…]` rule `(0,1,1)` regardless of source order                                                                        |
| `voice`, `geometry`, `surface` (`style-guide.css`)   | `--f-sans`, `--radius-sm`, `--shadow-sm`, and a nested `[data-part~="sg-glass-target"]` child rule | Hand-written CSS: variables outside `--sg-*` and nested-child selectors are not representable by a theme override (see [`examples/design-system/README.md`](../../examples/design-system/README.md)) |

The old single-axis key was renamed; a theme still using it is rejected with a message pointing at `themeAxes`. See the [migration guide](../migration/3.x-to-4.0.md) for the exact message and the rewrite.

## The `--sg-*` intermediate variables

`--sg-*` is an intermediate layer: it exists to break the circular reference that appears when a theme switches a variable that `@theme inline` also defines.

```css
/* Without the intermediate layer: circular! */
@theme inline {
  --color-primary: var(--color-primary);
}

/* With it: theme switching works */
:root {
  --sg-color-primary: #3b82f6;
}
html[data-theme="dark"] {
  --sg-color-primary: #60a5fa;
}
@theme inline {
  --color-primary: var(--sg-color-primary);
}
```

Prefer standard Tailwind classes and the `--color-*` variables in application code:

```html
<div class="bg-primary text-foreground">…</div>
```

```css
.custom {
  color: var(--color-primary);
}
```

**Public contract.** The variables the generator emits (`--sg-color-<key>`, `--sg-shadow-<key>`, `--sg-radius-<key>`, `--sg-font-<key>`, `--sg-border-width-<key>`, `--sg-backdrop-blur-<key>`, and the inline `--sg-sp-*` spacing variables) are part of the public output: aliases resolve to them, and hand-written CSS may read or override them. Renaming one is a breaking change — 5.0 renamed the color variables from `--sg-<color>` to `--sg-color-<key>`. `style-gen doctor` warns (`file:line`) about leftover `var(--sg-<colorKey>)` references or `--sg-<colorKey>:` declarations; see the [4.x → 5.0 guide](../migration/4.x-to-5.0.md).

## Built-in utility name clashes

A theme key whose class equals a Tailwind utility (`bg-none`, `shadow-none`, `rounded-none`, a typography key that becomes `text-sm`, `h-1` from `h1`, or `italic`, colors named `transparent`/`current`/`inherit`) is not rejected, but which rule wins is up to Tailwind's implementation of that utility. Pick a different name (`clear`, `flat`, `zero`, `heading1`); `style-gen doctor` lists the clashes it recognises. A digit-only `borderWidth` key (`2`) is different: since 5.0 the theme value replaces Tailwind's built-in `border-2`, `border-x-2` and `divide-x-2` (Tailwind looks up the theme before its default scale); `doctor` still reports it so you confirm the override is intended.
