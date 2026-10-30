# Spacing (./spacing)

Browser-safe helpers that turn spacing props into the `sp-*` class and the inline `--sg-sp-*` variables the generated CSS reads.

Spacing utilities are generated once as `@utility sp-<key>` blocks; components only set inline variables. A `--sg-sp-<key>[-<breakpoint>]` variable is registered with `@property … { syntax: "*"; inherits: false }`, and each utility carries its own breakpoint fallback chain:

```css
@utility sp-p {
  padding: var(--sg-sp-p);
  @media (width >= 768px) {
    padding: var(--sg-sp-p-md, var(--sg-sp-p));
  }
  @media (width >= 1024px) {
    padding: var(--sg-sp-p-lg, var(--sg-sp-p-md, var(--sg-sp-p)));
  }
}
```

Default keys: `p`, `px`, `py`, `pt`, `pb`, `pl`, `pr`, `m`, `mx`, `my`, `mt`, `mb`, `ml`, `mr`, `gap`, `gap-x`, `gap-y`, `top`, `right`, `bottom`, `left` (`SpacingKey`). Disable with `spacing: { enabled: false }`; customise with `spacing: { properties: { inset: ["top", "bottom"] } }` (a spacing key → the CSS properties it sets).

## Usage in components

```tsx
import {
  resolveSpacingProps,
  type ResponsiveValueStrict,
} from "@duydpdev/style-generator/spacing";
import type { CSSProperties, ReactNode } from "react";

interface BoxProps {
  p?: ResponsiveValueStrict<number>;
  px?: ResponsiveValueStrict<number>;
  m?: ResponsiveValueStrict<number>;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const Box = ({ p, px, m, className, style, children }: BoxProps) => {
  const spacing = resolveSpacingProps({ p, px, m });
  return (
    <div
      className={[spacing.classNames, className].filter(Boolean).join(" ")}
      style={{ ...spacing.style, ...style }}
    >
      {children}
    </div>
  );
};

<Box p={4} />;
// → class="sp-p" style="--sg-sp-p: 1rem"

<Box p={{ base: 2, md: 4, lg: 8 }} />;
// → class="sp-p" style="--sg-sp-p: 0.5rem; --sg-sp-p-md: 1rem; --sg-sp-p-lg: 2rem"
```

- `classNames` is a **string** (space-joined), not an array.
- **Same-element rule:** the variables do not inherit, so the class and the `style` variables must be on the **same element**; a parent's `--sg-sp-p` never leaks into a child.
- Only breakpoints listed in `options.breakpoints` (default `["md","lg"]`) have a fallback chain; a variable for any other breakpoint has no effect.
- `resolveSpacing(prop, value, unit?)` resolves a single prop; `unit` defaults to `0.25` (rem per step).
- Responsive values use `ResponsiveValueStrict<T, B>`: a typo like `{ typo: 4 }` is a type error, and `base` is always allowed. `B` defaults to `md | lg`, the breakpoints the default spacing CSS covers; with custom `options.breakpoints`, pass the same keys as the type argument (`resolveSpacingProps<"md" | "lg" | "xl">(…)`, `ResponsiveValueStrict<number, "md" | "lg" | "xl">`).

## `resolveSpacing`

<!-- signature: resolveSpacing -->

```ts
export declare const resolveSpacing: <
  BKeys extends string = DefaultBreakpointKeys,
>(
  prop: SpacingKey | (string & {}),
  value: ResponsiveValueStrict<number, NoInferBKeys<BKeys>>,
  unit?: number,
) => {
  className: string;
  style: Record<string, string>;
};
```

Resolve a single spacing prop into className + inline style CSS variables.
Breakpoint keys default to the ones the spacing CSS emits (`md`/`lg`); pass
`BKeys` when `options.breakpoints` adds others. `BKeys` is never inferred
from the value ({@link NoInferBKeys}), so a typo such as `{ tablet: 4 }` stays an error.

<!-- /signature -->

Resolves one spacing prop into a `className` and its inline `style` variables.

## `resolveSpacingProps`

<!-- signature: resolveSpacingProps -->

```ts
export declare const resolveSpacingProps: <
  BKeys extends string = DefaultBreakpointKeys,
>(
  props: Partial<
    Record<
      SpacingKey,
      ResponsiveValueStrict<number, NoInferBKeys<BKeys>> | undefined
    >
  >,
) => {
  classNames: string;
  style: Record<string, string>;
};
```

Resolve multiple spacing props at once.

<!-- /signature -->

Resolves several spacing props at once into one space-joined `classNames` string and one `style` object.

## `DEFAULT_SPACING_PROPERTIES`

<!-- signature: DEFAULT_SPACING_PROPERTIES -->

```ts
export declare const DEFAULT_SPACING_PROPERTIES: {
  readonly p: readonly ["padding"];
  readonly px: readonly ["padding-left", "padding-right"];
  readonly py: readonly ["padding-top", "padding-bottom"];
  readonly pt: readonly ["padding-top"];
  readonly pb: readonly ["padding-bottom"];
  readonly pl: readonly ["padding-left"];
  readonly pr: readonly ["padding-right"];
  readonly m: readonly ["margin"];
  readonly mx: readonly ["margin-left", "margin-right"];
  readonly my: readonly ["margin-top", "margin-bottom"];
  readonly mt: readonly ["margin-top"];
  readonly mb: readonly ["margin-bottom"];
  readonly ml: readonly ["margin-left"];
  readonly mr: readonly ["margin-right"];
  readonly gap: readonly ["gap"];
  readonly "gap-x": readonly ["column-gap"];
  readonly "gap-y": readonly ["row-gap"];
  readonly top: readonly ["top"];
  readonly right: readonly ["right"];
  readonly bottom: readonly ["bottom"];
  readonly left: readonly ["left"];
};
```

Default spacing properties → CSS properties each utility sets.
`generateSpacingCss` turns each entry into an `@utility sp-<key>` block
whose declarations read `var(--sg-sp-<key>)`. Passing
`options.spacing.properties` REPLACES this map; spread it to extend.

<!-- /signature -->

The default spacing keys and the CSS properties each `sp-<key>` utility sets.

## `SpacingKey`

<!-- signature: SpacingKey -->

```ts
export declare type SpacingKey = keyof typeof DEFAULT_SPACING_PROPERTIES;
```

Literal union of every default spacing property key (e.g. `"p" | "px" |
... | "left"`). The single spacing-key type used repo-wide — inferred
from `DEFAULT_SPACING_PROPERTIES` via `as const satisfies` so it stays a
literal union instead of widening to `string`.

<!-- /signature -->

The literal union of every default spacing key.

## `ResponsiveValueStrict`, `DefaultBreakpointKeys`

<!-- signature: ResponsiveValueStrict -->

```ts
export declare type ResponsiveValueStrict<
  T,
  BKeys extends string = DefaultBreakpointKeys,
> = T | Partial<Record<BKeys | "base", T | undefined>>;
```

Responsive value type: simple value or per-breakpoint object.
The generic `BKeys` lets a project customize the breakpoints when wrapping the type.
`base` is always available by default, independent of `BKeys`. A typo in a
breakpoint key is a type error — there is no `(string & {})` fallback.

<!-- /signature -->

<!-- signature: DefaultBreakpointKeys -->

```ts
export declare type DefaultBreakpointKeys =
  (typeof DEFAULT_BREAKPOINTS)[number];
```

Breakpoint keys the spacing CSS covers by default (`DEFAULT_BREAKPOINTS`,
`md`/`lg`). A project that sets `options.breakpoints` passes its own keys
as `BKeys`, e.g. `ResponsiveValueStrict<number, "sm" | "md" | "xl">`.

<!-- /signature -->

The per-breakpoint value type and the breakpoint keys the spacing CSS covers by default (`md`, `lg`).
