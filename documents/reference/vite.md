# Vite and Nuxt (./vite)

The Vite plugin that writes `theme.css` for you; Nuxt uses it through `vite.plugins`. It needs the optional `vite` peer dependency and runs in Node.

All of them write the same `theme.css` (the output of `generate()`); pick the one that matches your bundler. In each case, `@import` the file next to `@import "tailwindcss"`.

## `styleGenVite`

<!-- signature: styleGenVite -->

```ts
export declare const styleGenVite: (opts?: StyleGenViteOptions) => Plugin_2;
```

Vite plugin that emits `theme.css` from a theme JSON. Replaces the
manual `generate-theme.mjs` script step in Tailwind v4 setups. The file is
written in `buildStart` (before any module is transformed, so
`@tailwindcss/vite` finds it when it scans for `@source`), the theme is
registered with `addWatchFile`, and the dev server re-emits and sends a
full-reload when it changes. A failure in `buildStart` fails the build
through `this.error`.

Called with no argument it reads `style-gen.config.json` (else
`package.json#style-gen`) from the Vite root — the `theme`, `output` and
every `generate()` option — exactly as `style-gen generate` does.

Emitting is write-if-changed, so the second `buildStart` of a `vite build`
(one per environment) is a no-op.

Path rules (`resolveProjectPath`): `themePath` may be anywhere (absolute, or
`..` out of the root); `outDir` must stay inside the project root.

Monorepo: warns once if a plugin instance from a DIFFERENT Vite config (or
root, when there is no config file) targets the same `theme.css`. Two
`styleGenVite()` calls inside ONE config file are not warned about: that
is indistinguishable from the per-environment instances Vite creates in
builder mode and from a dev-server restart.

`theme.css` is written atomically (`writeFileAtomic`: sibling temp file +
`renameSync`), so `@tailwindcss/vite` never reads a half-written file.

**Limitations:**

- **Symlinks are not `realpath`'d.** `resolveProjectPath` compares the
  logical (non-dereferenced) path against the project root; it never calls
  `fs.realpathSync`. An `outDir` that is itself a symlink living inside the
  root is accepted even if its TARGET resolves outside it — the guard only
  rejects a literal `..`-escaping input path, not a symlink whose target
  escapes after the filesystem resolves it.

<!-- /signature -->

Emits `theme.css` when a dev server starts and when a build starts (`buildStart`), and again whenever the theme file changes (a debounced re-emit; the browser full-reloads only when the CSS actually changed). The theme is registered with Rollup (`this.addWatchFile`), so `vite build --watch` rebuilds on theme edits too. The file is written before Tailwind scans; the examples list the plugin ahead of `@tailwindcss/vite`. A failure at `buildStart` fails the build with a staged message (`Invalid JSON in …`, `Invalid options:`, `Invalid theme (<path>):`, `Invalid theme/options:`, `Cannot write …`). `themePath` may be absolute or outside the project root (a shared theme package); `outDir` must stay inside it.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { options } from "./style-gen.options"; // one shared options module, see §7

export default defineConfig({
  plugins: [
    styleGenVite({
      themePath: "src/theme/theme.json",
      outDir: "src/theme", // must match the @import path in your CSS
      options,
    }),
    tailwindcss(),
  ],
});
```

Nuxt runs on Vite: register the same plugin in `nuxt.config.ts` under `vite.plugins`. Nuxt 4 sets the Vite `root` to `app/`, so a relative `themePath` would resolve from there; pass absolute paths (`fileURLToPath(new URL("./theme.json", import.meta.url))`). The three examples (`examples/react-v4`, `examples/next-v4`, `examples/nuxt-v4`) share one theme and one `options` module from [`examples/design-system`](../../examples/design-system/README.md). Add `theme.css` to `.gitignore` if the theme JSON is your source of truth.

**Dev-server notes.** On Vite 5, `buildStart` of a dev server runs on `server.listen()` (or in `middlewareMode`), so a `createServer()` that never calls `listen()` does not write `theme.css`; from Vite 6 the plugin sets `perEnvironmentStartEndDuringDev` and `buildStart` also runs for `createServer()` + `ssrLoadModule`. The plugin reads `style-gen.config.json` **once**, when Vite loads its config: restart the dev server after editing it (only the theme file is watched).

**No arguments.** `styleGenVite()` (and `styleGenNext()`) read `style-gen.config.json` (else `package.json["style-gen"]`) from the Vite root (Next: `process.cwd()`): `theme`, `output` (the CSS file to write, default `styles/theme.css`) and every `generate()` option in it, so the CLI and the bundler share one source of truth. An invalid or malformed config throws `[style-gen-vite] Invalid config (<file>):` followed by the issues — it never falls back to defaults silently. With arguments, the config file is not read. Both no-argument forms read the file once, when the bundler loads its config (restart `vite`/`next dev` after editing it).

## `StyleGenViteOptions`

<!-- signature: StyleGenViteOptions -->

```ts
export declare interface StyleGenViteOptions {
  themePath: string;
  outDir?: string;
  options?: StyleGeneratorOptions;
}
```

Options of the `styleGenVite()` Vite plugin.

<!-- /signature -->

Options of `styleGenVite()`: the theme path, the output directory and the generator options.
