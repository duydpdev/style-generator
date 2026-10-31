# Cookbook

Task-sized recipes; each links to the reference page that owns the API.

## Generate the CSS without a bundler plugin

The CLI-only flow needs no bundler plugin: generate `theme.css` before the dev server and the build, and keep a watcher running during development:

```json
{
  "scripts": {
    "predev": "style-gen generate",
    "dev": "vite",
    "prebuild": "style-gen generate",
    "build": "vite build"
  }
}
```

```bash
yarn style-gen generate --watch   # second terminal: regenerates on every theme or style-gen.config.json edit
```

npm runs the `pre*` scripts automatically; Yarn Berry does not, so chain them there (`"dev": "style-gen generate && vite"`). `style-gen.config.json` carries the `theme`, `output` and generator options (`examples/design-system/style-gen.config.json` is a working one). Or call `generate()` yourself:

```ts
import { writeFileSync } from "node:fs";
import {
  generate,
  defineTheme,
  defineOptions,
  Breakpoint,
} from "@duydpdev/style-generator";
import themeJson from "./theme.json";

const theme = defineTheme(themeJson); // type-checks AND validates at runtime
const options = defineOptions({ breakpoints: [Breakpoint.MD, Breakpoint.LG] });

const { css, tokens } = generate(theme, options);
writeFileSync("styles/theme.css", css, "utf8");
```

## Report validation errors

`defineTheme()` throws a `ZodError` with the offending path for unknown keys or unsafe values, and TypeScript rejects a missing `colors` at compile time. `formatZodError` turns that error into one `path → message` line per issue:

```ts
import { ZodError } from "zod";
import { generate, formatZodError } from "@duydpdev/style-generator";
import theme from "./theme.json";
import { options } from "./style-gen.options";

try {
  generate(theme, options);
} catch (e) {
  if (e instanceof ZodError) console.error(formatZodError(e));
  throw e;
}
```

## Classes built at runtime

Class names built at runtime (a template literal such as `` `bg-${variant}` ``) are invisible to Tailwind's static scan; list them with `extraSources`, e.g. `extraSources: ["hover:bg-{primary,secondary}"]`. See [`extraSources`](./reference/options.md).

## Trim the generated `@source inline` lines

`coverage` drops a category's `@source inline` lines or keeps only some prefixes or the aliased keys; see [`coverage`](./reference/options.md#coverage-trim-the-source-inline-lines-per-category).
