# Design canvases

Internal: the producer and the check are repository scripts, not part of the npm package. Run them from a checkout whose `git rev-parse HEAD` is recorded in the design system's `ds-stamp.json`.

A design canvas (a folder of `*.dc.html` artboards) or a design-system artifact is a consumer of a product's `theme.json`, never a second source of values. It reads the variables `generate()` emits and the classes the design system ships; it declares no colour, radius, shadow, font or type value of its own.

## One theme per UI set

Every UI set — an app, a design canvas, a design-system artifact — has its own `theme.json` in the product's repository, with keys named after that product's roles. A design system or a canvas is built from that theme and declares no token values of its own. No tool enforces this; it is a review rule. The public wording lives in the [agent contract](../agent-contract.md) §1, and §5 forbids the two patterns that break it.

Why:

- Values copied into a canvas drift. The theme changes, the canvas keeps the old hex code, and nobody sees the two disagree until a screen ships with both.
- Values live once. A primitive (`blue600`) holds a value; a semantic key (`primary`) points at it, so a role keeps its meaning when its value moves, and dark mode re-points aliases instead of copying values. Typography keys name their value (`text16Regular`), so the weight lives in the theme and never in a `font-weight:` on an artboard.

## From theme to canvas

1. Write `theme.json` following the naming convention of the [agent contract](../agent-contract.md#naming-convention).
2. Run `style-gen generate` and `style-gen doctor` in the product folder.
3. Build the design system:
   `node scripts/build-ds.mjs --theme <theme.json> --config <style-gen.config.json> --preset <ds.preset.ts> --namespace <Name> --out <dir> [--name <title>]`.
   It writes `components/bundle.js`, `components/bundle.css`, `components/index.d.ts`, `components/Cover/preview.html`, `tokens.json`, `README.md` and `ds-stamp.json`.
   The theme needs at least one `typography` key (the cover title and the Text component use one) and the `background`, `primary`, `foreground`, `success` and `warning` colour keys the cover reads.
   The producer checks both before the build, names each missing key and exits 1 without writing anything. `borderRadius` is optional: without it the README's `## Radius` section says the theme defines no keys.
   The producer also checks its own output (README sections, cover variables, no unfilled placeholder) and writes nothing when a check fails; theme drift after a build is the checker's `--stamp` check.
   The stamp records the library version, the git SHA, `srcDirty`, the sha256 of the theme bytes and the namespace. Build from a clean checkout: when `srcDirty` is `true`, the SHA does not identify the code in the bundle.
4. Publish the output as a Design System artifact. Create it once and keep its URL; later builds update the same artifact.
5. Copy `components/bundle.css` and `components/bundle.js` to the canvas as `ds/<namespace>/components/bundle.css` and `ds/<namespace>/components/bundle.js`, keeping the `components/` folder: the check skips the bundle stylesheet only at that path, and a flattened copy would be scanned for Tailwind's own variables. Do not copy `tokens.css`: it declares unprefixed variables, which is a second namespace on a canvas.
6. Artboards use only `var(--sg-…)`, `calc(var(--spacing) * N)`, a few `--layout-*` variables and typography classes.
7. Dark mode is a `data-theme` attribute (or any `themeAxes` attribute) on any element. For the design-system bundle only, the producer gives every `html[data-…]` block a second, unscoped selector, so a wrapper `<div data-theme="dark">` switches the theme inside a frame. The CSS the library emits for apps stays pinned to `html`.

Write every variable name in full, also inside `<script>` strings: the check reads `var(--sg-…` there too, so `'var(--sg-color-' + key + ')'` is reported as `unknown token --sg-color-`. Generate a literal map from the theme instead.

Helper classes that reset typography (`font: inherit` on an input or a button reset) go inside `@layer components`. Tailwind's typography classes live in the `utilities` layer; an unlayered reset beats every layer and would cancel the class's size.

## Naming

Keys follow the naming convention of the [agent contract](../agent-contract.md#naming-convention); `scripts/check-design-canvas.mjs --naming` checks it on a canvas's theme, including that every typography size is on the scale (12, 14, 16, 20, 24, 32, 40, 56; the manifest's `typeScale`). When migrating an existing canvas, map each old typography class to the `text<size><Weight>` key with the same size and weight, and add the `font-<family>` class where the old style set a font family; move a size that is not on the scale to the nearest step and record the move in the migration notes.

## Core boards

<!-- core-boards:start -->

| File               | Page  | Title                                                      |
| ------------------ | ----- | ---------------------------------------------------------- |
| `Main.dc.html`     | `bia` | `Board / Bìa / Tổng quan board / v2`                       |
| `ds-mau.dc.html`   | `ds`  | `Board / Design system / Màu sắc / Light + Dark`           |
| `ds-chu.dc.html`   | `ds`  | `Board / Design system / Typography & định dạng số`        |
| `ds-khung.dc.html` | `ds`  | `Board / Design system / Spacing · Radius · Shadow · Icon` |
| `ds-luoi.dc.html`  | `ds`  | `Board / Design system / Lưới & breakpoint`                |
| `ds-token.dc.html` | `ds`  | `Board / Design system / Xuất token CSS · JSON`            |

<!-- core-boards:end -->

The core boards appear in `canvas.json#order` in the order of this table. Each design-system component has a board `c-<kebab name>.dc.html` on page `cl` whose title starts with `Component / `. Screens are free. Only `ds-mau` and `ds-token` may read primitive colour variables.

## What is not a token

- Spacing: `calc(var(--spacing) * N)`, or the spacing utilities in app code.
- Control heights: component props (`size`), not a variable.
- Layout widths (a sidebar, a rail, the content column): a few `--layout-*` variables in the canvas's own `layout.css`. No theme category covers them, so they are not a second token namespace.

## Checking a canvas

```bash
node scripts/check-design-canvas.mjs --canvas <dir> --theme <theme.json> [--stamp <ds-stamp.json>] [--intents primary,danger] [--naming] [--boards] [--standard <file>] [--ds-version <namespace>=<version>]
```

`--standard` points at another manifest (default: `scripts/design-canvas-standard.json`), so a product with other board titles keeps its own file.
`--naming` checks the theme's keys against the naming convention, inline `font-weight` and primitive colour variables on screens; without it those rules are off.
`--boards` checks the pages, the core boards and their order, and one board per design-system component in `canvas.json`.
`--ds-version <namespace>=<version>` checks that `canvas.json` installs that design-system version.

It scans every `*.dc.html` and `*.css` under `--canvas`, except `node_modules` and the producer's own `ds/<namespace>/tokens.css` and `ds/<namespace>/components/bundle.css`, and prints `OK: <n> files` (exit 0) or one line per violation followed by `<n> violation(s)` (exit 1). A usage error exits 2.

| Message                                                            | Meaning                                                                                                                                |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `second token namespace --x`                                       | A custom property other than `--sg-*`, `--spacing`, `--tw-*` and `--layout-*` is read or declared.                                     |
| `parallel token text --bl-…`                                       | Text that spells an old token name (`--bl-…`) outside a `var()`: a label, a sample or a script string still showing the retired names. |
| `unchecked stylesheet /_blob/…`                                    | The artboard loads a stylesheet that lives outside the theme.                                                                          |
| `unchecked blob link /_blob/…`                                     | The artboard links a file that lives outside the theme (a download, an image).                                                         |
| `font-size … (use a typography class)`                             | A `font-size:` other than `inherit`, including `{{binding}}` values.                                                                   |
| `font shorthand (use a typography class)`                          | A `font:` declaration other than `font: inherit`.                                                                                      |
| `unknown token --sg-…`                                             | The variable is not produced by this theme (`--sg-sp-*` is always allowed).                                                            |
| `unknown intent …`                                                 | With `--intents`: a `*.Button` `color` that is not one of the listed variant names.                                                    |
| `stamp does not match theme (rebuild the design system)`           | With `--stamp`: the design system was built from different theme bytes.                                                                |
| `font-weight … (use a typography class)`                           | With `--naming`: a `font-weight:` other than `inherit`, including `{{binding}}` values.                                                |
| `primitive token --sg-color-… (use a semantic key)`                | With `--naming`: a primitive colour variable read outside the manifest's `primitiveBoards` (`ds-mau`, `ds-token`).                     |
| `colors.… is not a primitive name and not an alias of a primitive` | With `--naming`: a semantic key holds a literal value.                                                                                 |
| `colors.… is a primitive name but holds an alias`                  | With `--naming`: a key named like a primitive (`blue600`) holds a `$` alias.                                                           |
| `colors.… aliases semantic key … (alias a primitive)`              | With `--naming`: an alias points at another semantic key.                                                                              |
| `themeAxes.….colors.… overrides a primitive`                       | With `--naming`: an override redefines a primitive instead of re-pointing a semantic key.                                              |
| `themeAxes.….colors.… is not an alias of a primitive`              | With `--naming`: an override holds a literal value.                                                                                    |
| `missing semantic core key …`                                      | With `--naming`: one of the manifest's `semanticCore` keys is absent from `colors`.                                                    |
| `typography.… does not match text<size><Weight>`                   | With `--naming`: a typography key is not named after its value.                                                                        |
| `typography.… name says …px, fontSize is …`                        | With `--naming`: the size in the key differs from `fontSize` (a rem value counts as rem × 16).                                         |
| `typography.… name says …, fontWeight is …`                        | With `--naming`: the weight word differs from `fontWeight`.                                                                            |
| `typography.… sets fontFamily (use a font-<family> class)`         | With `--naming`: a typography entry sets a font family.                                                                                |
| `typography.… size …px is not on the scale`                        | With `--naming`: the size is not in the manifest's `typeScale`.                                                                        |
| `typography line-height differs at …px: …`                         | With `--naming`: keys of one size have different line heights.                                                                         |
| `borderRadius.… is not one of …`                                   | With `--naming`: a radius key outside the manifest's `radius` list.                                                                    |
| `missing page …`                                                   | With `--boards`: a manifest page is absent from `canvas.json#pages`.                                                                   |
| `page … is named "…", expected "…"`                                | With `--boards`: a manifest page has another name.                                                                                     |
| `missing core board …`                                             | With `--boards`: a core board file or its `canvas.json#boards` entry is absent.                                                        |
| `board … is on page …, expected …`                                 | With `--boards`: a core or component board sits on another page.                                                                       |
| `board … title "…", expected "…"`                                  | With `--boards`: a core board has another title.                                                                                       |
| `missing component board …`                                        | With `--boards`: a design-system component has no `c-<kebab>.dc.html` board.                                                           |
| `board … title must start with "Component / "`                     | With `--boards`: a component board title lacks the prefix.                                                                             |
| `core boards out of order in canvas.json#order (expected …)`       | With `--boards`: the core boards are not in manifest order in `canvas.json#order`.                                                     |
| `missing canvas.json`                                              | With `--boards` or `--ds-version`: the canvas has no `canvas.json`.                                                                    |
| `design system … version …, expected …`                            | With `--ds-version`: `canvas.json#designSystems` installs another version.                                                             |
| `design system … is not installed`                                 | With `--ds-version`: no design system with that namespace is installed.                                                                |

`--inventory` prints what the canvas uses (JSON) instead of checking it; it still needs `--theme`. Its `varText` list is a starting point, not a complete list of boards that show token names: a documentation board that builds names at runtime does not appear there.

Run the check on a fresh read of the live canvas, not on the local copy alone. For a large canvas, comparing the artifact's file listing (sha256 per file) with the local files is an accepted read when there are 0 mismatches, no local-only file, and at least one file downloaded for real and compared byte for byte; the check then runs on that verified copy.

## Changing the theme

1. Edit `theme.json`.
2. Run `style-gen generate` (and `doctor`).
3. Rebuild the design system; the new `ds-stamp.json` records the new theme hash.
4. Publish it, then copy the bundle to the canvas.
5. Run the check with the new `--stamp`.
