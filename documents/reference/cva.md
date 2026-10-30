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
import { options } from "./style-gen.options";

const { DesignTokens } = createDesignTokens(theme, options);

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

**Prefix constraint.** `prefix` is typed `RegistryPrefix | ""` (the prefixes the registry emits `@source inline` for; `""` is typography), so `createVariantMapper("ring", …)` and a prefix held in a `string` variable are type errors: they would map to classes no `@source inline` line keeps. To opt out for a single prefix, pass `{ allowUnregisteredPrefix: true }` as the third argument and list the classes in `extraSources`. The opt-out does not combine with `{ states }` or with an array of prefixes.

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
