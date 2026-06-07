# Migration: v3 → v4

## TL;DR

v4 adds **subpath exports** for tree-shaking. Root barrel still works — no required code changes — but switching to subpaths reduces bundle size for consumers that only need a slice of the API.

## What changed

- `package.json` now declares `exports` map with 6 entry points + `"sideEffects": false`.
- New subpaths: `/plugin`, `/tokens`, `/cva`, `/spacing`, `/types`.
- Build emits 6 ESM + 6 CJS + 6 `.d.ts` chunks (was 1 each).
- Internal helpers split into shared chunks (`helpers-*.js`, `defaultOption-*.js`) — referenced by relative path inside `dist/`. **Do not import these directly** — only the published subpaths are public API.

## What did NOT change

- All v3 named exports still resolve from the root path:
  ```ts
  import {
    createStyleSystem,
    resolveSpacingProps,
  } from "@duydpdev/style-generator";
  ```
- Runtime behavior, theme schema, plugin output: identical.
- CLI (`style-gen init|safelist|doctor`) unchanged.

## Recommended migration

| Use case                                               | Old import                         | New (preferred)                           |
| ------------------------------------------------------ | ---------------------------------- | ----------------------------------------- |
| Build Tailwind plugin                                  | `from "@duydpdev/style-generator"` | `from "@duydpdev/style-generator/plugin"` |
| Use design tokens only                                 | root barrel                        | `/tokens`                                 |
| `createVariantMapper` for CVA                          | root barrel                        | `/cva`                                    |
| Runtime `resolveSpacing*` in components                | root barrel                        | `/spacing`                                |
| Type-only imports (`ThemeConfig`, `InferColorKeys`, …) | root barrel                        | `/types`                                  |

### Example

```diff
- import { createStyleSystem } from "@duydpdev/style-generator";
- import { resolveSpacingProps } from "@duydpdev/style-generator";
- import type { ThemeConfig } from "@duydpdev/style-generator";
+ import { createStyleSystem } from "@duydpdev/style-generator/plugin";
+ import { resolveSpacingProps } from "@duydpdev/style-generator/spacing";
+ import type { ThemeConfig } from "@duydpdev/style-generator/types";
```

## TypeScript requirement

Subpath exports need TypeScript module resolution that respects `exports` field:

- `tsconfig.json#compilerOptions.moduleResolution` must be `"bundler"`, `"node16"`, or `"nodenext"`.
- Legacy `"node"` (TS ≤ 4.x default) does **not** resolve subpaths. Stay on root barrel or upgrade.

## Bundle size impact (gzip)

| Subpath                | Size       |
| ---------------------- | ---------- |
| `/index` (root barrel) | 632 B      |
| `/plugin`              | 2.6 KB     |
| `/tokens`              | 0.35 KB    |
| `/cva`                 | 0.22 KB    |
| `/spacing`             | 0.45 KB    |
| `/types`               | 0 (erased) |

Consumer that only needs CVA: **~12× smaller** than v3 root import.

## Back-compat policy

Root barrel `.` will be **kept through v4.x**. Removal will be announced in v5 with at least one minor of deprecation warnings.
