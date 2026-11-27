# Vite and Nuxt (./vite)

The Vite plugin that writes `theme.css` for you; Nuxt uses it through `vite.plugins`. It needs the optional `vite` peer dependency and runs in Node.

The plugin writes the same `theme.css` as `generate()`; `@import` the file next to `@import "tailwindcss"`.

## `styleGenVite`

<!-- signature: styleGenVite -->

```ts
export declare const styleGenVite: (opts?: StyleGenViteOptions) => Plugin_2;
```

Vite plugin that emits `theme.css` and `theme.tokens.ts` in `buildStart`, reading `style-gen.config.json` in `root`.
The dev server re-emits on a theme or config edit and sends a full reload; a `buildStart` failure fails the build.

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

**Dev-server notes.** On Vite 5, `buildStart` of a dev server runs on `server.listen()` (or in `middlewareMode`), so a `createServer()` that never calls `listen()` does not write `theme.css`; from Vite 6 the plugin sets `perEnvironmentStartEndDuringDev` and `buildStart` also runs for `createServer()` + `ssrLoadModule`. The plugin also watches the config file: an edit reloads it in place (the target is resolved again, the files are re-emitted and the page reloads) without restarting the server. Both candidates (`style-gen.config.json` and `package.json#style-gen`) are watched, existing or not, so creating the first or moving the config between them is picked up; while `style-gen.config.json` exists, an event of `package.json` (`yarn add`) is ignored. An edit that cannot be used is logged as `[style-gen-vite] Cannot reload config, keeping the previous one:` and the last valid config stays in force; a failed re-emit is logged as `[style-gen-vite] Re-emit failed:` ([Troubleshooting](../troubleshooting.md#cannot-reload-config-and-re-emit-failed)).

**Configuration.** `styleGenVite()` and `styleGenNext()` read `style-gen.config.json` (else `package.json["style-gen"]`) from the Vite root (Next: `process.cwd()`): `theme`, `output` (the CSS file to write, default `styles/theme.css`), `tokensOutput` and every `generate()` option in it, so the CLI and the bundler share one source of truth. An invalid or malformed config throws `[style-gen-vite] Invalid config (<file>):` followed by the issues — it never falls back to defaults silently. With no config at all the plugin logs `No style-gen.config.json or package.json#style-gen found in <root>; using the defaults.` once and uses the defaults. Any plugin option other than `root` throws at call time.

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
