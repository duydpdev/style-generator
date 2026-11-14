# CVA helpers (./cva)

Browser-safe helpers that turn token keys into the class names the generated `@source inline` lines cover, for `class-variance-authority` or any variant map.

## `createVariantMapper`

<!-- signature: createVariantMapper -->

```ts
export declare function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
>(prefix: P, tokens: readonly T[]): VariantMap<T, P>;
export declare function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
>(prefixes: readonly P[], tokens: readonly T[]): MultiVariantMap<T, P>;
export declare function createVariantMapper<
  const T extends string,
  const P extends string,
>(
  prefix: P,
  tokens: readonly T[],
  opts: {
    readonly allowUnregisteredPrefix: true;
  },
): VariantMap<T, P>;
export declare function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
  const N extends number,
  const S extends readonly string[] = readonly [],
>(
  prefix: P,
  tokens: readonly T[],
  opts: {
    readonly opacities: readonly N[];
    readonly states?: S;
  },
): OpacityVariantMap<T, P, S, N>;
export declare function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
  const N extends number,
  const S extends readonly string[] = readonly [],
>(
  prefixes: readonly P[],
  tokens: readonly T[],
  opts: {
    readonly opacities: readonly N[];
    readonly states?: S;
  },
): {
  readonly [Px in P]: OpacityVariantMap<T, Px, S, N>;
};
export declare function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
  const S extends readonly string[],
>(
  prefix: P,
  tokens: readonly T[],
  opts: {
    readonly states: S;
  },
): StateVariantMap<T, P, S>;
export declare function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
  const S extends readonly string[],
>(
  prefixes: readonly P[],
  tokens: readonly T[],
  opts: {
    readonly states: S;
  },
): {
  readonly [Px in P]: StateVariantMap<T, Px, S>;
};
```

Creates a mapping of tokens to their corresponding prefixed CSS classes.
Classes are always kebab-cased with the SAME `toKebabCase` used by the
registry (`flattenByCategory`/`generateSourceInline`), so a mapper's
output is guaranteed to match a class the registry emits `@source
inline(...)` for.

The optional `{ states }` argument (e.g. `COLOR_STATES`) lists state names
to look up as sibling RAW tokens. For a raw token `t`, a state `s` is
appended to `t`'s class only when `tokens` also contains `t` + Pascal-cased
`s` (`primary` + `"hover"` -> `primaryHover`). A token with no matching
sibling keeps its plain single class; sibling tokens themselves are plain
single classes. The result is a literal chained string when `states` is a
literal tuple (`as const`, `COLOR_STATES`) and `string` when it is typed
`readonly string[]`. `{ allowUnregisteredPrefix: true }` accepts any
prefix string instead of only registry prefixes.

`{ opacities }` (e.g. `tokens.opacities`) adds a `token/step` key per token
and step mapped to `class/step` (`primary/10` -> `bg-primary/10`); combined
with `{ states }`, the state classes stay on the base key only
(`primary/10` never carries `hover:`). Not combinable with
`allowUnregisteredPrefix`.

<!-- /signature -->

`createVariantMapper(prefix, tokens)` returns a flat `Record<token, class>`. Classes are always kebab-cased with the same function the registry uses, so every class it returns is one that `@source inline` emits:

```ts
import { cva } from "class-variance-authority";
import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import {
  createVariantMapper,
  COLOR_STATES,
} from "@duydpdev/style-generator/cva";
import theme from "./theme.json";

const { DesignTokens } = createDesignTokens(theme);

const bg = createVariantMapper("bg", DesignTokens.Web.colors);
// { primary: "bg-primary", sidebarForeground: "bg-sidebar-foreground", … }

const button = cva("rounded px-4 py-2", { variants: { color: bg } });
button({ color: "primary" }); // → "rounded px-4 py-2 bg-primary"

// prefix "" yields the bare kebab-case token (typography):
createVariantMapper("", DesignTokens.Web.typography); // { text12Mono: "text-12-mono", … }

// several prefixes at once → nested map
createVariantMapper(["border-x", "border-y"], DesignTokens.Web.borderWidth);
```

**State classes.** With sibling keys `primaryHover` / `primaryActive` in the theme, `{ states }` collapses them into one class string per base token:

```ts
import {
  createVariantMapper,
  COLOR_STATES,
} from "@duydpdev/style-generator/cva";

const tokens = ["primary", "primaryHover", "primaryActive", "danger"] as const;
const bgStates = createVariantMapper("bg", tokens, { states: COLOR_STATES });
// {
//   primary: "bg-primary hover:bg-primary-hover active:bg-primary-active",
//   primaryHover: "bg-primary-hover",
//   primaryActive: "bg-primary-active",
//   danger: "bg-danger",
// }
```

Always pass `COLOR_STATES` rather than hard-coding the array — it is the same list the generated `@source inline` state lines come from.

**Prefix constraint.** `prefix` is typed `RegistryPrefix | ""` (the prefixes the registry emits `@source inline` for; `""` is typography), so `createVariantMapper("fill", …)` and a prefix held in a `string` variable are type errors: they would map to classes no `@source inline` line keeps. To opt out for a single prefix, pass `{ allowUnregisteredPrefix: true }` as the third argument and declare the classes with your own `@source inline(...)`. The opt-out does not combine with `{ states }`, with `{ opacities }` or with an array of prefixes.

**Opacity steps.** `{ opacities }` adds one `token/step` key per token and step (`primary/10` → `bg-primary/10`). Feed it `DesignTokens.Web.opacities`, which lists `options.coverage.colors.opacities`, so the keys you can type are exactly the classes the `@source inline` opacity line keeps. With `{ states }` the state classes stay on the base key (`primary/10` never carries `hover:`); with an array of prefixes every prefix map gets the keys. Without the option `opacities` is `[]` and the map has no extra key.

```ts
import { createVariantMapper } from "@duydpdev/style-generator/cva";
import { createDesignTokens } from "@duydpdev/style-generator/tokens";

const theme = { colors: { primary: "#2563eb", muted: "#6b7280" } } as const;
const options = { coverage: { colors: { opacities: [10, 50] } } } as const;

const web = createDesignTokens(theme, options).DesignTokens.Web;
const bg = createVariantMapper("bg", web.colors, {
  opacities: web.opacities,
});
const half: "bg-primary/50" = bg["primary/50"];
```

Pass the same `options` object to the bundler plugin or `style-gen.config.json` so the `@source inline` opacity line and `web.opacities` agree.

## `COLOR_STATES`

<!-- signature: COLOR_STATES -->

```ts
export declare const COLOR_STATES: readonly ["hover", "active"];
```

Interactive state suffixes a flat color token can opt into by declaring a
sibling key (`primary` + `primaryHover` -> `hover:bg-primary-hover`).

Single source of truth for BOTH sides of the contract: the registry's
`colorsCategory.states` (which drives the `@source inline` state lines) and
consumers passing `{ states: COLOR_STATES }` to `createVariantMapper`.
Kept in its own dependency-free module so the browser-safe `./tokens` and
`./cva` subpaths can re-export it without pulling Zod or the registry.

<!-- /signature -->

The interactive state suffixes (`hover`, `active`) shared by the `@source inline` state lines and `createVariantMapper(…, { states })`.

## `toKebabCase`

<!-- signature: toKebabCase -->

```ts
export declare const toKebabCase: (str: string) => string;
```

Converts a camelCase token key to the kebab-case used in class names and CSS variables: `"blue500"` → `"blue-500"`, `"primaryFG"` → `"primary-fg"`, `"2xl"` → `"2xl"`.

<!-- /signature -->

The camelCase → kebab-case function the registry and the mapper share (`blue500` → `blue-500`, `2xl` → `2xl`).
