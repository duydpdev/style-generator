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

## A theme with every category

A theme that uses every category (`$schema` is the editor's pointer, see [Editor autocomplete](#editor-autocomplete)):

```json
{
  "$schema": "./theme.schema.json",
  "colors": {
    "blue500": "#3B82F6",
    "primary": "$blue500",
    "primaryForeground": "#FFFFFF",
    "background": "#FFFFFF",
    "muted": "#8E8E93"
  },
  "typography": {
    "text16Medium": {
      "fontSize": "16px",
      "fontWeight": 500,
      "lineHeight": "150%",
      "letterSpacing": "0px"
    }
  },
  "shadows": { "sm": "0px 1px 2px rgba(0, 0, 0, 0.05)" },
  "backdropBlurs": { "sm": "4px" },
  "borderRadius": { "md": "8px" },
  "fontFamily": { "sans": "\"Inter\", system-ui, sans-serif" },
  "borderWidth": { "thin": "1px" },
  "motionDuration": { "fast": "150ms" },
  "motionEasing": { "standard": "cubic-bezier(0.2, 0, 0, 1)" },
  "controlHeight": { "md": "40px" },
  "iconSize": { "sm": "16px" },
  "opacity": { "disabled": 0.4 },
  "zIndex": { "modal": 50 }
}
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
| A `colors` key may not kebab-case to `x`, `y`, `x-<integer>`/`y-<integer>` or `x-<borderWidth key>`/`y-<borderWidth key>` (`divide-<key>` would be a Tailwind divider width)                                                | `colors` vs `borderWidth`                                                           | `x`, `y2`, `xThin` + `borderWidth.thin`                             | `xl`, `yellow`                     |
| A `typography` key may not kebab-case to `sp-*` or `font-*` (it would shadow the spacing and font utilities)                                                                                                                | `typography`                                                                        | `spBody`, `sp-body`, `fontBold`                                     | `body`, `spacious`                 |
| A `fontFamily` key may not kebab-case to `weight` / `size` or start with `weight-` / `size-` (Tailwind ignores `--font-weight-*` / `--font-size-*` as font families, so the key would overwrite the weight and size scales) | `fontFamily`                                                                        | `weightBold`, `size-xl`                                             | `weighty`, `sizeable`              |
| A `typography` key may not kebab-case to a class another category emits (`<prefix>-<key>`)                                                                                                                                  | `typography` vs `colors`, `borderWidth`, `shadows`, `borderRadius`, `backdropBlurs` | `textPrimary` next to `colors.primary`                              | `text12Mono`, `heading`            |
| Variants of one axis may not kebab-case to the same name (they would share one selector)                                                                                                                                    | `themeAxes.<axis>`                                                                  | `darkMode` + `dark-mode`                                            | `dark`, `highContrast`             |
| A `__proto__` key is never allowed (it can only come from parsed JSON)                                                                                                                                                      | every token, axis and variant name, at any depth                                    | `__proto__`                                                         | any other name                     |
| Axis and variant names may not be canonical integers                                                                                                                                                                        | `themeAxes`                                                                         | `100`, `2024`                                                       | `contrast100`, `007`               |

The CLI, `styleGenVite` and `styleGenNext` print the rename hint on the offending path (for example `colors.CTA → Key "CTA" yields class "cta" in the CSS but "c-ta" through the typed tokens; rename it to "cta" …`).

A `__proto__` key is rejected at its exact path wherever it appears in a theme. It can only come from a parsed JSON document, and without the check the token would be dropped silently:

```json
{
  "colors": { "primary": "#3B82F6", "__proto__": "#000000" }
}
```

```text
Invalid theme (styles/theme.json):
colors.__proto__ → "__proto__" is not a valid token name
```

## Categories

| Theme key        | Generates                                                                                                                      | Notes                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `colors`         | `bg-*`, `text-*`, `border-*` via `@theme inline` (`--color-*`)                                                                 | Required. Flat, camelCase.                                                                                                                                                     |
| `typography`     | `@utility <kebab-key>` (`text16Medium` → `.text-16-medium`)                                                                    | Entry: `fontSize`, `lineHeight`, `fontWeight` (number, 1–1000), optional `letterSpacing`/`fontFamily`/`fontStyle`; an absent `letterSpacing` emits no declaration. No aliases. |
| `shadows`        | `shadow-*`                                                                                                                     |                                                                                                                                                                                |
| `backdropBlurs`  | `backdrop-blur-*`                                                                                                              |                                                                                                                                                                                |
| `borderRadius`   | `rounded-*` (+ `md:`/`lg:` variants for the active breakpoints)                                                                | Falls back to `DEFAULT_ROUNDED_VALUES`.                                                                                                                                        |
| `fontFamily`     | `font-*` via Tailwind's `--font-*` namespace                                                                                   | Keys may not be Tailwind font-weight names (`bold`, `medium`, …).                                                                                                              |
| `borderWidth`    | `border`, `border-x/y/t/r/b/l/s/e`, `divide-x/y` via Tailwind's `--border-width-*` namespace (backed by `--sg-border-width-*`) | Falls back to Tailwind's own `0/1/2/4` scale when omitted or empty (`{}`). Replaces Tailwind's `border` width scale.                                                           |
| `motionDuration` | `duration-*` via `--transition-duration-*` (backed by `--sg-duration-*`)                                                       | See [Scale groups](#scale-groups).                                                                                                                                             |
| `motionEasing`   | `ease-*` via `--ease-*` (backed by `--sg-ease-*`)                                                                              | See [Scale groups](#scale-groups).                                                                                                                                             |
| `controlHeight`  | `h-control-*` via `--height-control-*` (backed by `--sg-control-*`)                                                            | See [Scale groups](#scale-groups).                                                                                                                                             |
| `iconSize`       | `size-icon-*` via `--size-icon-*` (backed by `--sg-icon-*`)                                                                    | See [Scale groups](#scale-groups).                                                                                                                                             |
| `opacity`        | `opacity-*` via `--opacity-*` (`calc(var(--sg-opacity-*) * 100%)`)                                                             | See [Scale groups](#scale-groups).                                                                                                                                             |
| `zIndex`         | `z-*` via `--z-index-*` (backed by `--sg-z-*`)                                                                                 | See [Scale groups](#scale-groups).                                                                                                                                             |

## Scale groups

The six scale groups (`motionDuration`, `motionEasing`, `controlHeight`, `iconSize`, `opacity`, `zIndex`) are optional literal scales: each value is one literal of the grammar below, never a `$` alias, and `coverage` only switches a group on or off (see [`coverage`](./options.md#coverage-trim-the-source-inline-lines-per-category)). Each class reads its `--sg-*` variable through a Tailwind theme namespace, so a `themeAxes` override of a declared key (`"motion": { "reduced": { "motionDuration": { "fast": "0ms" } } }`) switches the class at runtime.

| Group            | Value                                                                                                                                                                 | Class (property)                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `motionDuration` | One time in `ms` or `s` (`150ms`, `0.2s`)                                                                                                                             | `duration-<key>` (`transition-duration`)    |
| `motionEasing`   | `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, `step-start`, `step-end`, `cubic-bezier(x1, y1, x2, y2)` with `x1` and `x2` in 0–1, or `steps(n[, position])` | `ease-<key>` (`transition-timing-function`) |
| `controlHeight`  | One length in `px` or `rem`                                                                                                                                           | `h-control-<key>` (`height`)                |
| `iconSize`       | One length in `px` or `rem`                                                                                                                                           | `size-icon-<key>` (`width` and `height`)    |
| `opacity`        | A JSON number from 0 to 1                                                                                                                                             | `opacity-<key>` (`opacity`)                 |
| `zIndex`         | A JSON integer                                                                                                                                                        | `z-<key>` (`z-index`)                       |

**`opacity` keys are named by role, never by number.** The `opacity` group names element opacities: `"opacity": { "disabled": 0.4 }` emits the utility `opacity-disabled` (`opacity: calc(var(--sg-opacity-disabled) * 100%)`). A named key also works as a colour modifier: `bg-primary/disabled` mixes the colour at `calc(var(--sg-opacity-disabled) * 100%)`. The mapping multiplies by `100%` because `color-mix()` takes only a percentage; `--sg-opacity-*` keeps the theme's 0–1 number. `coverage.colors.opacities` adds numeric alpha modifiers to the colour classes: `"coverage": { "colors": { "opacities": [50] } }` covers `bg-primary/50`. Both read Tailwind's `--opacity-*` namespace: a key `50` would replace the `/50` step of every colour class with the theme's value, so a digit-only `opacity` key is rejected. `DesignTokens.Web.opacity` lists the group's keys and `DesignTokens.Web.opacities` the coverage steps.

**`controlHeight` also feeds `min-h-*` and `max-h-*`.** Tailwind reads `--height-control-*` for `min-h-control-<key>` and `max-h-control-<key>` too, and `createTailwindMergeExtension` puts them in the `min-h`/`max-h` groups. `@source inline` covers only `h-control-<key>`: the app's source scan picks up the other two where they are written. In the same way, `--opacity-*` also feeds `backdrop-opacity-<key>`, which `createTailwindMergeExtension` puts in the `backdrop-opacity` group and `@source inline` does not cover.

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

### Translucent alias (`$key/n`)

In `colors`, a value `"$<key>/<n>"` (`<n>` an integer percent from 1 to 100, no leading zero) is the target colour at `<n>%` opacity and is emitted as `color-mix(in srgb, var(--sg-color-<kebab-key>) <n>%, transparent)`. The target must exist and the graph must stay acyclic, exactly as for `"$<key>"`; any other category rejects the form. It also works inside a `themeAxes` override, and the result follows the target in the active mode. The key holding it is an ordinary colour key, so Tailwind's `/<n>` modifier still works on it (`bg-scrim/50` stacks a second `color-mix()`: 60% of 50% is 30%).

```json
{
  "colors": { "ink": "#000000", "scrim": "$ink/60" },
  "themeAxes": { "theme": { "dark": { "colors": { "ink": "#ffffff" } } } }
}
```

```css
:root {
  --sg-color-ink: #000000;
  --sg-color-scrim: color-mix(in srgb, var(--sg-color-ink) 60%, transparent);
}

html[data-theme="dark"] {
  --sg-color-ink: #ffffff;
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

`primary` now opts into `hover:bg-primary-hover` and `active:bg-primary-active` (and the `text-`/`border-` forms). The state table is the exported constant `COLOR_STATES`: a `Hover`, `Active` or `Selected` sibling gets the `hover:`, `active:` or `aria-selected:` variant (`primarySelected` → `aria-selected:bg-primary-selected`, applied when the element has `aria-selected="true"`); feed it to `createVariantMapper(prefix, tokens, { states: COLOR_STATES })` to get the class string, see [section 7](./cva.md).

## Editor autocomplete

```bash
yarn style-gen schema
```

`style-gen schema` writes `theme.schema.json` next to the theme file and `style-gen.config.schema.json` in the project root. Add `"$schema": "./theme.schema.json"` to the theme and `"$schema": "./style-gen.config.schema.json"` to `style-gen.config.json`, and the editor suggests keys and flags unknown ones. The schemas describe keys and value shapes; the checks that compare values with each other (aliases, collisions, `breakpoints` against `screens`) run in `generate`, the plugins and `style-gen doctor`.

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

- **Selectors are pinned to `html`, and the attribute is always `data-<axis-kebab>`.** A `data-*` attribute on a wrapper element has no effect. The reason is aliases: a `var()` alias resolves at the element that _declares_ the custom property (`:root`), so an override on any other element never reaches an alias's value. A theme scoped to one element or a custom attribute name is hand-written CSS in your app.
- **Attribute values are the kebab form of the key**: variant `highContrast` → `data-palette="high-contrast"`; axis `colorScheme` → `data-color-scheme`.
- **Precedence is declaration order.** The selectors have equal specificity, so when two axes override the same token the axis declared **later** in the JSON wins.
- **Axis and variant names cannot be canonical integers** (`100`, `2024`): JavaScript enumerates integer-like keys first, which would silently break declaration order. Use `contrast100` instead.
- **A variant cannot be named `base`**: `"base"` is the "no override" value of `ThemeAxesState` and `themeAxisAttributes`, so a variant of that name could never be switched on. `ThemeSchema` rejects `themeAxes.<axis>.base`; name it `default` or `standard`. (An axis named `base` is fine.)
- **Override keys must already exist in the base** record; an override-only key would produce no utility and is rejected.
- **Compound overrides stay hand-written CSS.** A single override cannot target two axes' attributes at once:

| Axis (source)                                        | Content                                                                                | Handling                                                                                                                                                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme` (`themeAxes.theme.dark`)                     | override `--sg-*` colors + shadows                                                     | Generated by the library — `html[data-theme="dark"]`                                                                                                                                                 |
| `palette` (`themeAxes.palette.{forest,sunset,mono}`) | override `--sg-*` colors                                                               | Generated by the library — `html[data-palette="forest\|sunset\|mono"]`                                                                                                                               |
| compound `[data-theme="dark"][data-palette="…"]`     | cross-axis override (dark × a specific palette)                                        | Hand-written CSS: its `(0,2,0)` specificity beats either single-axis `html[data-…]` rule `(0,1,1)` regardless of source order                                                                        |
| `voice`, `geometry`, `surface` (`style-guide.css`)   | `--f-sans`, `--radius-sm`, `--shadow-sm`, and a nested `.x-sg-glass-target` child rule | Hand-written CSS: variables outside `--sg-*` and nested-child selectors are not representable by a theme override (see [`examples/design-system/README.md`](../../examples/design-system/README.md)) |

### Cross-axis alias cycles

Every axis applies to the same `html` element, so an alias in one axis can chain into an alias in another. The theme is rejected when a combination of at most one variant per axis closes a cycle, even though each axis is acyclic on its own:

```json
{
  "colors": { "a": "#111111", "b": "#222222" },
  "themeAxes": {
    "theme": {
      "dark": { "colors": { "a": "$b" } }
    },
    "palette": {
      "forest": { "colors": { "b": "$a" } }
    }
  }
}
```

`theme.dark` points `a` at `b` and `palette.forest` points `b` at `a`; with both active `a → b → a`. The error names the later axis:

```text
Invalid theme (styles/theme.json):
themeAxes.palette.forest.colors.b → Alias cycle detected when themeAxes.theme.dark and themeAxes.palette.forest are active together: a → b → a — axes apply to the same element, so these aliases chain across axes; point one of them at a literal value.
```

Point one of the two keys at a literal value to break the cycle.

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

**Public contract.** The variables the generator emits (`--sg-color-<key>`, `--sg-shadow-<key>`, `--sg-radius-<key>`, `--sg-font-<key>`, `--sg-border-width-<key>`, `--sg-backdrop-blur-<key>`, `--sg-duration-<key>`, `--sg-ease-<key>`, `--sg-control-<key>`, `--sg-icon-<key>`, `--sg-opacity-<key>`, `--sg-z-<key>`, and the inline `--sg-sp-*` spacing variables) are part of the public output: aliases resolve to them, and hand-written CSS may read or override them. Renaming one is a breaking change.

## Built-in utility name clashes

A theme key whose class equals a Tailwind utility (`bg-none`, `shadow-none`, `rounded-none`, a typography key that becomes `text-sm`, `h-1` from `h1`, or `italic`, colors named `transparent`/`current`/`inherit`, colors whose `ring-`/`outline-`/`divide-` class is a Tailwind static such as `solid` → `outline-solid` or an integer width such as `3` → `ring-3`) is not rejected, but which rule wins is up to Tailwind's implementation of that utility. Pick a different name (`clear`, `flat`, `zero`, `heading1`); `style-gen doctor` lists the clashes it recognises. A digit-only `borderWidth` key (`2`) is different: its theme value replaces Tailwind's built-in `border-2`, `border-x-2` and `divide-x-2` (Tailwind looks up the theme before its default scale); `doctor` still reports it so you confirm the override is intended. The scale groups clash the same way: a `motionDuration` key `initial` and a `motionEasing` key `linear`, `in`, `out`, `inOut` or `initial` (`ease-in`) name a class Tailwind ships. A `zIndex` key `auto` and a digit-only `zIndex` or `motionDuration` key (`10` → `z-10`) are overrides, like the digit-only `borderWidth` key: the theme value replaces Tailwind's rule (`z-10` → `z-index: var(--sg-z-10)`). `doctor` reports each one.
