# Next.js (./next)

The Next.js config wrapper that writes `theme.css` for you. It runs in Node and adds no peer dependency.

It writes the same `theme.css` (the output of `generate()`) as `style-gen generate` and the Vite plugin; `@import` the file next to `@import "tailwindcss"`.

## `styleGenNext`

<!-- signature: styleGenNext -->

```ts
export declare const styleGenNext: (
  opts?: StyleGenNextOptions,
) => <TConfig>(
  nextConfig: TConfig,
) => (phase: string, ctx?: NextConfigContext) => ResolvedNextConfig<TConfig>;
```

Next.js config wrapper that emits `theme.css` and `theme.tokens.ts`, read from `style-gen.config.json` in `root`.
Only the dev-server and production-build phases touch the disk; `next dev` also watches and re-emits.

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

It emits `theme.css` and `theme.tokens.ts` only when Next loads the config in `phase-development-server` (`next dev`, which also watches the theme file and the config file) or `phase-production-build` (`next build`, and other commands that load the config in that phase); every other phase (`next start`, export, info, test) returns the config without reading the theme, so a production image need not ship it. `styleGenNext(opts)(nextConfig)` returns Next's `(phase, ctx) => config` function, so export its result as shown. `nextConfig` may be a plain object or the function form `(phase, { defaultConfig }) => config`, which is called with Next's arguments. Editing the config file while `next dev` runs reloads it in place; both candidates (`style-gen.config.json` and `package.json#style-gen`) are watched, an event of `package.json` is ignored while `style-gen.config.json` exists, and an edit that cannot be used is logged as `[style-gen-next] Cannot reload config, keeping the previous one:` while the previous config stays in force. Without any config the plugin logs `No style-gen.config.json or package.json#style-gen found in <root>; using the defaults.` once and uses the defaults. The dev watcher keeps running when an edit makes the theme invalid (the error is logged as `[style-gen-next] Re-emit failed:` and the last good `theme.css` stays), and is replaced when the config is reloaded with another theme or output path. `theme` may be absolute or outside the project; `output` and `tokensOutput` must stay inside it (`[style-gen-next] output escapes project root: <path>`), and a leading `/` is kept as an absolute path, not rewritten to a relative one. Limitation: the paths are checked against the root by logical path — a symlink inside the project that points outside it is not detected.

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
