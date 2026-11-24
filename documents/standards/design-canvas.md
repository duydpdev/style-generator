# Design canvases

Internal: the producer and the check are repository scripts, not part of the npm package. Run them from a checkout whose `git rev-parse HEAD` is recorded in the design system's `ds-stamp.json`.

A design canvas (a folder of `*.dc.html` artboards) or a design-system artifact is a consumer of a product's `theme.json`, never a second source of values. It reads the variables `generate()` emits and the classes the design system ships; it declares no colour, radius, shadow, font or type value of its own.

## One theme per UI set

Every UI set — an app, a design canvas, a design-system artifact — has its own `theme.json` in the product's repository, with keys named after that product's roles. A design system or a canvas is built from that theme and declares no token values of its own. No tool enforces this; it is a review rule. The public wording lives in the [agent contract](../agent-contract.md) §1, and §5 forbids the two patterns that break it.

Why:

- Values copied into a canvas drift. The theme changes, the canvas keeps the old hex code, and nobody sees the two disagree until a screen ships with both.
- Keys named after values (`text16Medium`, `blue500` as an intent) stop meaning anything when the value changes. A role key (`label`, `danger`) keeps its meaning when its value moves.

## From theme to canvas

1. Write `theme.json` with role keys, following the [agent contract](../agent-contract.md).
2. Run `style-gen generate` and `style-gen doctor` in the product folder.
3. Build the design system:
   `node scripts/build-ds.mjs --theme <theme.json> --config <style-gen.config.json> --preset <preset.json> --namespace <Name> --out <dir> [--name <title>]`.
   It writes `components/bundle.js`, `components/bundle.css`, `components/index.d.ts`, `tokens.json`, `README.md` and `ds-stamp.json`.
   The stamp records the library version, the git SHA, `srcDirty`, the sha256 of the theme bytes and the namespace. Build from a clean checkout: when `srcDirty` is `true`, the SHA does not identify the code in the bundle.
4. Publish the output as a Design System artifact. Create it once and keep its URL; later builds update the same artifact.
5. Copy `components/bundle.css` and `components/bundle.js` to the canvas as `ds/<namespace>/components/bundle.css` and `ds/<namespace>/components/bundle.js`, keeping the `components/` folder: the check skips the bundle stylesheet only at that path, and a flattened copy would be scanned for Tailwind's own variables. Do not copy `tokens.css`: it declares unprefixed variables, which is a second namespace on a canvas.
6. Artboards use only `var(--sg-…)`, `calc(var(--spacing) * N)`, a few `--layout-*` variables and typography classes.
7. Dark mode is a `data-theme` attribute (or any `themeAxes` attribute) on any element. For the design-system bundle only, the producer gives every `html[data-…]` block a second, unscoped selector, so a wrapper `<div data-theme="dark">` switches the theme inside a frame. The CSS the library emits for apps stays pinned to `html`.

Write every variable name in full, also inside `<script>` strings: the check reads `var(--sg-…` there too, so `'var(--sg-color-' + key + ')'` is reported as `unknown token --sg-color-`. Generate a literal map from the theme instead.

Helper classes that reset typography (`font: inherit` on an input or a button reset) go inside `@layer components`. Tailwind's typography classes live in the `utilities` layer; an unlayered reset beats every layer and would cancel the class's size.

## Typography roles

Name roles after their job: `display`, `pageTitle`, `heading1`, `heading2`, `body`, `label`, `caption`, `micro`. When migrating an existing canvas, map each size to the nearest role when it is within 15% of the role's size. Otherwise add a role, or ask the designer which role the text plays.

## What is not a token

- Spacing: `calc(var(--spacing) * N)`, or the spacing utilities in app code.
- Control heights: component props (`size`), not a variable.
- Layout widths (a sidebar, a rail, the content column): a few `--layout-*` variables in the canvas's own `layout.css`. No theme category covers them, so they are not a second token namespace.

## Checking a canvas

```bash
node scripts/check-design-canvas.mjs --canvas <dir> --theme <theme.json> [--stamp <ds-stamp.json>] [--intents primary,danger]
```

It scans every `*.dc.html` and `*.css` under `--canvas`, except `node_modules` and the producer's own `ds/<namespace>/tokens.css` and `ds/<namespace>/components/bundle.css`, and prints `OK: <n> files` (exit 0) or one line per violation followed by `<n> violation(s)` (exit 1). A usage error exits 2.

| Message                                                  | Meaning                                                                                                                                |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `second token namespace --x`                             | A custom property other than `--sg-*`, `--spacing`, `--tw-*` and `--layout-*` is read or declared.                                     |
| `parallel token text --bl-…`                             | Text that spells an old token name (`--bl-…`) outside a `var()`: a label, a sample or a script string still showing the retired names. |
| `unchecked stylesheet /_blob/…`                          | The artboard loads a stylesheet that lives outside the theme.                                                                          |
| `unchecked blob link /_blob/…`                           | The artboard links a file that lives outside the theme (a download, an image).                                                         |
| `font-size … (use a typography class)`                   | A `font-size:` other than `inherit`, including `{{binding}}` values.                                                                   |
| `font shorthand (use a typography class)`                | A `font:` declaration other than `font: inherit`.                                                                                      |
| `unknown token --sg-…`                                   | The variable is not produced by this theme (`--sg-sp-*` is always allowed).                                                            |
| `unknown intent …`                                       | With `--intents`: a `*.Button` `color` that is not one of the listed variant names.                                                    |
| `stamp does not match theme (rebuild the design system)` | With `--stamp`: the design system was built from different theme bytes.                                                                |

`--inventory` prints what the canvas uses (JSON) instead of checking it; it still needs `--theme`. Its `varText` list is a starting point, not a complete list of boards that show token names: a documentation board that builds names at runtime does not appear there.

Run the check on a fresh read of the live canvas, not on the local copy alone. For a large canvas, comparing the artifact's file listing (sha256 per file) with the local files is an accepted read when there are 0 mismatches, no local-only file, and at least one file downloaded for real and compared byte for byte; the check then runs on that verified copy.

## Changing the theme

1. Edit `theme.json`.
2. Run `style-gen generate` (and `doctor`).
3. Rebuild the design system; the new `ds-stamp.json` records the new theme hash.
4. Publish it, then copy the bundle to the canvas.
5. Run the check with the new `--stamp`.
