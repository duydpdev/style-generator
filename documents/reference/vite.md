# Vite and Nuxt (./vite)

The Vite plugin that writes `theme.css` for you; Nuxt uses it through `vite.plugins`. It needs the optional `vite` peer dependency and runs in Node.

The plugin writes the same `theme.css` as `generate()`; `@import` the file next to `@import "tailwindcss"`.

## `styleGenVite`

<!-- signature: styleGenVite -->

```ts
export declare const styleGenVite: (opts?: StyleGenViteOptions) => Plugin_2;
```

Vite plugin that emits `theme.css` and `theme.tokens.ts` from a theme JSON.
The files are written in `buildStart` (before any module is transformed, so
`@tailwindcss/vite` finds the CSS when it scans for `@source`), the theme is
registered with `addWatchFile`, and the dev server re-emits and sends a
full-reload when it changes. A failure in `buildStart` fails the build
through `this.error`.

Every option lives in `style-gen.config.json` (else
`package.json#style-gen`) in the plugin's `root` (default: Vite's root): the
`theme`, `output`, `tokensOutput` and every `generate()` option, exactly as
`style-gen generate` reads them. The only plugin option is `root`; a
relative one resolves against Vite's root (Nuxt sets Vite's root to `app/`,
so it passes the project folder).

A change to the config file in the dev server reloads it in place: the
target is resolved again, the files are re-emitted and the page reloads. An
invalid edit is logged and the last valid config stays in force. The server
is never restarted, so this works inside hosts that own it (Nuxt, Storybook).

Emitting is write-if-changed, so the second `buildStart` of a `vite build`
(one per environment) is a no-op.

Path rules (`resolveProjectPath`): the theme may live anywhere (absolute, or
`..` out of the root); the generated files must stay inside `root`.

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
  `fs.realpathSync`. An `output` that is itself a symlink living inside the
  root is accepted even if its TARGET resolves outside it — the guard only
  rejects a literal `..`-escaping input path, not a symlink whose target
  escapes after the filesystem resolves it.

<!-- /signature -->

Emits `theme.css` and `theme.tokens.ts` when a dev server starts and when a build starts (`buildStart`), and again whenever the theme file or the config file changes (a debounced re-emit; the browser full-reloads only when the CSS actually changed). The theme is registered with Rollup (`this.addWatchFile`), so `vite build --watch` rebuilds on theme edits too. The files are written before Tailwind scans; the examples list the plugin ahead of `@tailwindcss/vite`. A failure at `buildStart` fails the build with a staged message (`Invalid JSON in …`, `Invalid options:`, `Invalid theme (<path>):`, `Invalid theme/options:`, `Cannot write …`). `theme` may be absolute or outside the project root (a shared theme package); `output` and `tokensOutput` must stay inside it.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

export default defineConfig({
  plugins: [styleGenVite(), tailwindcss()],
});
```

```json
{
  "theme": "src/theme/theme.json",
  "output": "src/theme/theme.css",
  "breakpoints": ["md", "lg"]
}
```

`output` must match the `@import` path in your CSS. Commit `theme.tokens.ts` (app code imports `tokens` from it) and add `theme.css` to `.gitignore` if the theme JSON is your source of truth.

Nuxt runs on Vite: register the same plugin in `nuxt.config.ts` under `vite.plugins`. Nuxt 4 sets the Vite `root` to `app/`, so pass the project folder as `root` (`styleGenVite({ root: fileURLToPath(new URL(".", import.meta.url)) })`) and keep `style-gen.config.json` there. The harness example (`examples/harness`) takes its theme and `style-gen.config.json` from [`examples/design-system`](../../examples/design-system/README.md); [`examples/plain-nuxt`](../../examples/plain-nuxt/README.md) keeps its theme in `app/theme/theme.json`.

**Dev-server notes.** On Vite 5, `buildStart` of a dev server runs on `server.listen()` (or in `middlewareMode`), so a `createServer()` that never calls `listen()` does not write `theme.css`; from Vite 6 the plugin sets `perEnvironmentStartEndDuringDev` and `buildStart` also runs for `createServer()` + `ssrLoadModule`. The plugin also watches the config file: an edit reloads it in place (the target is resolved again, the files are re-emitted and the page reloads) without restarting the server; an invalid edit is logged and the last valid config stays in force.

**Configuration.** `styleGenVite()` and `styleGenNext()` read `style-gen.config.json` (else `package.json["style-gen"]`) from the Vite root (Next: `process.cwd()`): `theme`, `output` (the CSS file to write, default `styles/theme.css`), `tokensOutput` and every `generate()` option in it, so the CLI and the bundler share one source of truth. An invalid or malformed config throws `[style-gen-vite] Invalid config (<file>):` followed by the issues — it never falls back to defaults silently. The 7.x options `themePath`, `outDir` and `options` were removed in 8.0 and throw at call time.

## `StyleGenViteOptions`

<!-- signature: StyleGenViteOptions -->

```ts
export declare interface StyleGenViteOptions {
  root?: string;
}
```

Options of the `styleGenVite()` Vite plugin.

<!-- /signature -->

Options of `styleGenVite()`: the directory that holds `style-gen.config.json`.
