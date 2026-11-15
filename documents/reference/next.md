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

Next.js config wrapper that emits `theme.css` and `theme.tokens.ts` from a
theme JSON — equivalent to `styleGenVite` for consumers who don't use Vite.
Deliberately does not import `next`: it stays a plain function of the config
object and phase string, so it works under both webpack and Turbopack
without adding a peer dependency.

Usage in `next.config.mjs`:

```js
import { styleGenNext } from "@duydpdev/style-generator/next";
export default styleGenNext()(nextConfig);
```

Every option lives in `style-gen.config.json` (else
`package.json#style-gen`) in `process.cwd()` — the `theme`, `output`,
`tokensOutput` and every `generate()` option — exactly as
`style-gen generate` reads them. The only plugin option is `root`, the
directory holding that file (a relative one resolves against
`process.cwd()`): `styleGenNext({ root })(nextConfig)`.

Path rules (`resolveProjectPath`, against the root): the theme may live
anywhere (absolute, or `..` out of the project: a monorepo shares one); the
generated files must stay inside it.

Only `phase-development-server` and `phase-production-build` read the
theme and write the files; every other phase (`phase-production-server`,
`phase-export`, `phase-info`, `phase-test`) returns the config without
touching the disk, so a production container need not ship the theme JSON.
A function-form Next config is called with `(phase, ctx)` and its result
is returned.

In `next dev` a change to the config file reloads it in place and
re-emits; an invalid edit is logged and the last valid config stays in
force.

**Limitation:**

- **Symlinks are not `realpath`'d.** `resolveProjectPath` compares the
  logical (non-dereferenced) path against the root; it never calls
  `fs.realpathSync`. An `output` that is itself a symlink living inside
  the project is accepted even if its TARGET resolves outside it — the
  guard only rejects a literal `..`-escaping input path, not a symlink
  whose target escapes after the filesystem resolves it.

<!-- /signature -->

Works with webpack and Turbopack and does not import `next`, so it adds no peer dependency:

```ts
// next.config.ts
import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";

const nextConfig: NextConfig = {};

export default styleGenNext()(nextConfig);
```

```json
{
  "theme": "app/theme/theme.json",
  "output": "app/theme/theme.css"
}
```

```css
/* app/globals.css */
@import "tailwindcss";
@import "./theme/theme.css";
```

It emits `theme.css` and `theme.tokens.ts` only when Next loads the config in `phase-development-server` (`next dev`, which also watches the theme file and the config file) or `phase-production-build` (`next build`, and other commands that load the config in that phase); every other phase (`next start`, export, info, test) returns the config without reading the theme, so a production image need not ship it. `styleGenNext(opts)(nextConfig)` returns Next's `(phase, ctx) => config` function, so export its result as shown. `nextConfig` may be a plain object or the function form `(phase, { defaultConfig }) => config`, which is called with Next's arguments. Editing the config file while `next dev` runs reloads it in place. The dev watcher keeps running when an edit makes the theme invalid (the error is logged and the last good `theme.css` stays), and is replaced when the config is reloaded with another theme or output path. `theme` may be absolute or outside the project; `output` and `tokensOutput` must stay inside it (`[style-gen-next] output escapes project root: <path>`) and a leading `/` is **not** rewritten to a relative path any more. Limitation: the paths are checked against `process.cwd()` by logical path — a symlink inside the project that points outside it is not detected.

## `StyleGenNextOptions`

<!-- signature: StyleGenNextOptions -->

```ts
export declare interface StyleGenNextOptions {
  root?: string;
}
```

Options of `styleGenNext()`, which wraps a Next.js config and emits `theme.css` and `theme.tokens.ts` for `next dev` and `next build`.

<!-- /signature -->

Options of `styleGenNext()`: the directory that holds `style-gen.config.json`.
