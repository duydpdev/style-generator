<!-- source: documents/reference/recipes.md sha256: 0b2c65e04023 -->

# Recipe (./recipes)

Các helper phía component an toàn cho trình duyệt: một extension `tailwind-merge` cho các token của bạn, các prop spacing có kiểu và các thuộc tính DOM của trục theme. Subpath này không được re-export từ `.`.

`@duydpdev/style-generator/recipes` an toàn cho trình duyệt và không được re-export từ `.`. Nó không import bất cứ thứ gì từ `tailwind-merge`; hãy dùng `tailwind-merge` 3.x làm dependency riêng của ứng dụng của bạn (extension đã hard-code các group id của v3 và key theme `radius`).

```tsx
import { extendTailwindMerge } from "tailwind-merge";
import {
  createTailwindMergeExtension,
  splitSpacingProps,
  themeAxisAttributes,
  type SpacingProps,
} from "@duydpdev/style-generator/recipes";
import type { BreakpointKeys } from "@duydpdev/style-generator/types";

// `theme` is your theme JSON, `options` the const object shared with the bundler
// plugin, `tokens` = createDesignTokens(theme, options).DesignTokens.Web
import { options } from "./style-gen.options";
import { theme, tokens } from "./tokens";

// 1. `twMerge` that knows your custom tokens (`border-thin` is a width, not a color)
export const twMerge = extendTailwindMerge(
  createTailwindMergeExtension(tokens),
);

// 2. Typed spacing props → `sp-*` class + inline `--sg-sp-*` style
type BoxProps = SpacingProps<BreakpointKeys<typeof options>> & { id?: string };
export const Box = (props: BoxProps) => {
  const { spacing, rest } = splitSpacingProps(props, tokens.spacingProperties);
  return <div {...rest} className={spacing.className} style={spacing.style} />;
};

// 3. DOM attributes of the active theme axes (pass `{ attribute }` as the second
//    argument when `options.axes.attribute` renames them)
export const Root = () => (
  <html {...themeAxisAttributes<typeof theme>({ theme: "dark" })} />
);
```

Một phiên bản đầy đủ, đã được kiểm thử (`cn`, `axisAttributes`, các headless recipe của sáu component mẫu, CSS dùng chung) nằm trong [`examples/design-system`](../../../examples/design-system/README.md). [Component](../components.md) chỉ ra cách các component mẫu của `examples/harness` bọc các recipe này; [`guide.md`](../guide.md#xây-dựng-component) hướng dẫn từng bước qua quy trình đó. [`createCn`](./ui.md#createcn-cn) trong `./ui` bọc extension này cùng với `clsx`.

## `createTailwindMergeExtension`, `TailwindMergeExtension`, `TailwindMergeTokens`

<!-- signature: createTailwindMergeExtension -->

```ts
export declare const createTailwindMergeExtension: (
  tokens: TailwindMergeTokens,
) => TailwindMergeExtension;
```

Build the `tailwind-merge` v3 config extension for a theme's custom
tokens, so `twMerge` stops treating `border-thin` as a border colour,
`rounded-pill` / `shadow-card` as unknown classes, or `text-10-light` as a
text colour:

```ts
import { extendTailwindMerge } from "tailwind-merge";
import { createTailwindMergeExtension } from "@duydpdev/style-generator/recipes";
declare const tokens: Parameters<typeof createTailwindMergeExtension>[0];

const twMerge = extendTailwindMerge(createTailwindMergeExtension(tokens));
```

- `shadows`, `backDropBlurs` and `borderWidth` (incl. side, logical and
  `divide-*` prefixes) extend the matching `tailwind-merge` groups; the
  group ids are `tailwind-merge`'s own (`border-w`, `border-w-x`, …).
- `borderRadius` extends `tailwind-merge`'s `radius` theme scale, which
  every `rounded-*` group reads, so `rounded-pill` merges with
  `rounded-lg`, and `rounded-tl-pill`/`rounded-s-pill` with their own
  side and corner siblings.
- `typography` keys are whole class names (`text-10-light`) and form the
  group `sg-typography`. A later `sg-typography` class removes earlier
  `font-size`/`font-weight`/`leading`/`tracking` classes; a later
  single-property utility refines it (both are kept).
- `colors` and `fontFamily` are deliberately absent: the default `color`
  and `font-family` groups already accept any value.

Variants (`hover:`, `md:`) are stripped by `tailwind-merge` before group
lookup, so only bare class parts are listed. Empty token lists emit no
group.

<!-- /signature -->

<!-- signature: TailwindMergeExtension -->

```ts
export declare interface TailwindMergeExtension {
  readonly extend: {
    readonly classGroups: Readonly<
      Record<
        string,
        readonly (string | Readonly<Record<string, readonly string[]>>)[]
      >
    >;
    readonly conflictingClassGroups: Readonly<
      Record<string, readonly string[]>
    >;
    readonly theme: Readonly<Record<string, readonly string[]>>;
  };
}
```

Structural shape of a `tailwind-merge` v3 `extendTailwindMerge(...)`
argument. Declared here, not imported, so `dist/recipes.d.ts` never names
`tailwind-merge` (it is the app's dependency, not this package's).

<!-- /signature -->

<!-- signature: TailwindMergeTokens -->

```ts
export declare interface TailwindMergeTokens {
  readonly typography: readonly string[];
  readonly shadows: readonly string[];
  readonly backDropBlurs: readonly string[];
  readonly borderRadius: readonly string[];
  readonly borderWidth: readonly string[];
}
```

The slice of the design tokens the extension reads. `generate().tokens.Web`
and `createDesignTokens().DesignTokens.Web` are assignable to it; `colors`
and `fontFamily` are not needed (see {@link createTailwindMergeExtension}).

<!-- /signature -->

- `createTailwindMergeExtension` bao quát các token `typography`, `shadows`, `backDropBlurs`, `borderRadius` và `borderWidth`; màu sắc và font family vốn đã khớp với các group `color`/`font-family` mặc định của tailwind-merge. `borderRadius` mở rộng scale theme `radius` của tailwind-merge, nhờ đó các utility theo phía, theo logic và góc (`rounded-tl-pill`, `rounded-s-pill`) sẽ merge với các sibling `rounded-*` của chúng. Một class typography đứng sau sẽ loại bỏ các class `font-size`/`font-weight`/`leading`/`tracking` đứng trước; một utility đơn thuộc tính đứng sau sẽ tinh chỉnh lại nó.

## `splitSpacingProps`, `SpacingProps`

<!-- signature: splitSpacingProps -->

```ts
export declare const splitSpacingProps: <
  K extends string,
  P extends object & SpacingProps<BKeys, K>,
  BKeys extends string = DefaultBreakpointKeys,
>(
  props: P,
  keys: readonly K[],
  unit?: number,
) => {
  spacing: {
    className: string;
    style: Record<string, string>;
  };
  rest: Omit<P, CamelCase<SpacingPropKeys<K>>>;
};
```

Split a component's props into its spacing props (resolved to the
`sp-*` class and inline `--sg-sp-*` style) and everything else. Every
camelCased key of `keys` is removed from `rest`, even when its value is
`undefined`, so `p={undefined}` never reaches the DOM.

`props` is checked against `SpacingProps<BKeys, K>`, so a literal such as
`{ p: "4" }` or `{ p: { tablet: 4 } }` is a type error. `BKeys` is not
inferred (it defaults to `md | lg`): props typed with
`SpacingProps<BKeys>` are accepted as they are, since extra breakpoint
keys are structurally compatible, but an object literal mixing a known
and an unknown breakpoint (`{ md: 4, tablet: 4 }`) is not caught. Pass all
three type arguments (`splitSpacingProps<K, Props, BKeys>(...)`, `BKeys`
from `BreakpointKeys<typeof options>`) to check a literal against the
configured breakpoints.

<!-- /signature -->

<!-- signature: SpacingProps -->

```ts
export declare type SpacingProps<
  BKeys extends string = DefaultBreakpointKeys,
  K extends string = SpacingKey,
> = {
  readonly [P in SpacingPropKeys<K> as CamelCase<P>]?:
    | ResponsiveValueStrict<number, BKeys>
    | undefined;
};
```

Component props for the spacing utilities: every key of `K` camelCased
(`gap-x` → `gapX`), each optional and responsive. `K` defaults to the
built-in properties; pass `tokens.spacingProperties` elements when
`options.spacing.properties` adds or removes some, and `BKeys` (e.g.
`BreakpointKeys<typeof options>`) when `options.breakpoints` adds
breakpoints. A widened `K` (`string`) means the built-in properties;
explicit literal keys give the narrowest result.

<!-- /signature -->

- `splitSpacingProps` kiểm tra kiểu `props` đối chiếu với `SpacingProps<BKeys, K>`: `{ p: "4" }` và `{ p: { tablet: 4 } }` là lỗi kiểu. `BKeys` có giá trị mặc định là `md | lg` và không được suy luận kiểu (inferred); props có kiểu `SpacingProps<BreakpointKeys<typeof options>>` được chấp nhận nguyên trạng, và `splitSpacingProps<K, Props, BKeys>(…)` cũng kiểm tra các object literal đối chiếu với các breakpoint riêng của bạn. Hàm này loại bỏ mọi key spacing khỏi `rest` (kể cả key có giá trị `undefined`), nhờ đó `p={undefined}` không bao giờ lọt vào DOM.

## `themeAxisAttributes`

<!-- signature: themeAxisAttributes -->

```ts
export declare const themeAxisAttributes: <T extends ThemeConfig>(
  state: ThemeAxesState<T>,
  options?: {
    readonly attribute?: Readonly<Record<string, string>> | undefined;
  },
) => Readonly<Record<string, string>>;
```

The DOM attributes that activate a theme's axis variants, mirroring the
`html[data-<axis>="<variant>"]` selectors `generate()` emits. Spread the
result on the element the selectors target (`<html>` by default):

```tsx
import { themeAxisAttributes } from "@duydpdev/style-generator/recipes";

const root = (
  <html {...themeAxisAttributes({ theme: "dark", palette: "base" })} />
);
// → data-theme="dark" (palette emits nothing)
```

An axis that is `"base"` or `undefined` produces **no** attribute, so no
override block matches and the `:root` values apply. React removes a prop
that disappears between renders; an imperative caller must
`removeAttribute(...)` for an axis it omits.

<!-- /signature -->

- `themeAxisAttributes` không sinh thuộc tính nào cho một trục có giá trị `"base"` hoặc `undefined`. React sẽ xóa một prop biến mất giữa các lần render; caller theo phong cách mệnh lệnh (imperative) phải tự gọi `removeAttribute` cho một trục bị bỏ qua.
