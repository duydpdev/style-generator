# Next.js (./next)

The Next.js config wrapper that writes `theme.css` for you. It runs in Node and adds no peer dependency.

All of them write the same `theme.css` (the output of `generate()`); pick the one that matches your bundler. In each case, `@import` the file next to `@import "tailwindcss"`.

## `styleGenNext`

<!-- signature: styleGenNext -->

```ts
export declare const styleGenNext: (
  opts?: StyleGenNextOptions,
) => <TConfig>(
  nextConfig: TConfig,
) => (phase: string, ctx?: NextConfigContext) => ResolvedNextConfig<TConfig>;
```

Next.js config wrapper that emits `theme.css` from a theme JSON —
equivalent to `styleGenVite` for consumers who don't use Vite. Deliberately
does not import `next`: it stays a plain function of the config object and
phase string, so it works under both webpack and Turbopack without adding
a peer dependency.

Usage in `next.config.mjs`:

```js
import { styleGenNext } from "@duydpdev/style-generator/next";
export default styleGenNext({ themePath: "./theme.json" })(nextConfig);
```

Called with no argument it reads `style-gen.config.json` (else
`package.json#style-gen`) from `process.cwd()` — the `theme`, `output` and
every `generate()` option — exactly as `style-gen generate` does:
`styleGenNext()(nextConfig)`.

Path rules (`resolveProjectPath`, against `process.cwd()`): the theme may
live anywhere (absolute, or `..` out of the project: a monorepo shares one);
`outDir` must stay inside the project.

Only `phase-development-server` and `phase-production-build` read the
theme and write `theme.css`; every other phase (`phase-production-server`,
`phase-export`, `phase-info`, `phase-test`) returns the config without
touching the disk, so a production container need not ship the theme JSON.
A function-form Next config is called with `(phase, ctx)` and its result
is returned.

**Limitation:**

- **Symlinks are not `realpath`'d.** `resolveProjectPath` compares the
  logical (non-dereferenced) path against `process.cwd()`; it never calls
  `fs.realpathSync`. An `outDir` that is itself a symlink living inside
  the project is accepted even if its TARGET resolves outside it — the
  guard only rejects a literal `..`-escaping input path, not a symlink
  whose target escapes after the filesystem resolves it.

<!-- /signature -->

Works with webpack and Turbopack and does not import `next`, so it adds no peer dependency:

```ts
// next.config.ts
import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";
import { options } from "./style-gen.options";

const nextConfig: NextConfig = {};

export default styleGenNext({
  themePath: "app/theme/theme.json",
  outDir: "app/theme",
  options,
})(nextConfig);
```

```css
/* app/globals.css */
@import "tailwindcss";
@import "./theme/theme.css";
```

It emits `theme.css` only when Next loads the config in `phase-development-server` (`next dev`, which also watches the theme file) or `phase-production-build` (`next build`, and other commands that load the config in that phase); every other phase (`next start`, export, info, test) returns the config without reading the theme, so a production image need not ship it. `styleGenNext(opts)(nextConfig)` returns Next's `(phase, ctx) => config` function, so export its result as shown. `nextConfig` may be a plain object or the function form `(phase, { defaultConfig }) => config`, which is called with Next's arguments. The dev watcher keeps running when an edit makes the theme invalid (the error is logged and the last good `theme.css` stays), and is replaced when the config is reloaded with another theme or output path. `themePath` may be absolute or outside the project; `outDir` must stay inside it (`[style-gen-next] outDir escapes project root: <path>`) and a leading `/` is **not** rewritten to a relative path any more. Limitation: the paths are checked against `process.cwd()` by logical path — a symlink inside the project that points outside it is not detected.

## `StyleGenNextOptions`

<!-- signature: StyleGenNextOptions -->

```ts
export declare interface StyleGenNextOptions {
  themePath: string;
  outDir?: string;
  options?: StyleGeneratorOptions;
}
```

Options of `styleGenNext()`, which wraps a Next.js config and emits `theme.css` for `next dev` and `next build`.

<!-- /signature -->

Options of `styleGenNext()`: the theme path, the output directory and the generator options.
