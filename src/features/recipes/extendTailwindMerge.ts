import { toKebabCase } from "../../shared/helpers";

/**
 * The slice of the design tokens the extension reads. `generate().tokens.Web`
 * and `createDesignTokens().DesignTokens.Web` are assignable to it; `colors`
 * and `fontFamily` are not needed (see {@link createTailwindMergeExtension}).
 */
export interface TailwindMergeTokens {
  readonly typography: readonly string[];
  readonly shadows: readonly string[];
  readonly backDropBlurs: readonly string[];
  readonly borderRadius: readonly string[];
  readonly borderWidth: readonly string[];
}

/**
 * Structural shape of a `tailwind-merge` v3 `extendTailwindMerge(...)`
 * argument. Declared here, not imported, so `dist/recipes.d.ts` never names
 * `tailwind-merge` (it is the app's dependency, not this package's).
 */
export interface TailwindMergeExtension {
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
    /** Extra theme scale values (`radius`), merged into the default scale. */
    readonly theme: Readonly<Record<string, readonly string[]>>;
  };
}

/**
 * Class prefixes of the border-width family. A local literal table on
 * purpose: the registry copy lives in the `./tokens` entry chunk and
 * importing it would move it into a shared chunk (cost on `./tokens`).
 * `extendTailwindMerge.test.ts` pins it against the registry.
 */
const BORDER_WIDTH_PREFIXES = [
  "border",
  "border-x",
  "border-y",
  "border-t",
  "border-r",
  "border-b",
  "border-l",
  "border-s",
  "border-e",
  "divide-x",
  "divide-y",
] as const;

/**
 * Build the `tailwind-merge` v3 config extension for a theme's custom
 * tokens, so `twMerge` stops treating `border-thin` as a border colour,
 * `rounded-pill` / `shadow-card` as unknown classes, or `text-10-light` as a
 * text colour:
 * ```ts
 * import { extendTailwindMerge } from "tailwind-merge";
 * import { createTailwindMergeExtension } from "@duydpdev/style-generator/recipes";
 * declare const tokens: Parameters<typeof createTailwindMergeExtension>[0];
 *
 * const twMerge = extendTailwindMerge(createTailwindMergeExtension(tokens));
 * ```
 * - `shadows`, `backDropBlurs` and `borderWidth` (incl. side, logical and
 *   `divide-*` prefixes) extend the matching `tailwind-merge` groups; the
 *   group ids are `tailwind-merge`'s own (`border-w`, `border-w-x`, …).
 * - `borderRadius` extends `tailwind-merge`'s `radius` theme scale, which
 *   every `rounded-*` group reads, so `rounded-pill` merges with
 *   `rounded-lg`, and `rounded-tl-pill`/`rounded-s-pill` with their own
 *   side and corner siblings.
 * - `typography` keys are whole class names (`text-10-light`) and form the
 *   group `sg-typography`. A later `sg-typography` class removes earlier
 *   `font-size`/`font-weight`/`leading`/`tracking` classes; a later
 *   single-property utility refines it (both are kept).
 * - `colors` and `fontFamily` are deliberately absent: the default `color`
 *   and `font-family` groups already accept any value.
 *
 * Variants (`hover:`, `md:`) are stripped by `tailwind-merge` before group
 * lookup, so only bare class parts are listed. Empty token lists emit no
 * group.
 * @param {TailwindMergeTokens} tokens - `generate().tokens.Web` or `createDesignTokens().DesignTokens.Web`
 * @returns {TailwindMergeExtension} Argument for `extendTailwindMerge`
 */
export const createTailwindMergeExtension = (
  tokens: TailwindMergeTokens,
): TailwindMergeExtension => {
  const classGroups: Record<string, (Record<string, string[]> | string)[]> = {};
  const theme: Record<string, string[]> = {};

  const addGroup = (id: string, prefix: string, keys: readonly string[]) => {
    if (keys.length > 0)
      classGroups[id] = [{ [prefix]: keys.map(toKebabCase) }];
  };

  addGroup("shadow", "shadow", tokens.shadows);
  addGroup("backdrop-blur", "backdrop-blur", tokens.backDropBlurs);
  if (tokens.borderRadius.length > 0) {
    theme.radius = tokens.borderRadius.map(toKebabCase);
  }
  for (const prefix of BORDER_WIDTH_PREFIXES) {
    addGroup(prefix.replace(/^border/, "border-w"), prefix, tokens.borderWidth);
  }

  const conflictingClassGroups: Record<string, string[]> = {};
  if (tokens.typography.length > 0) {
    classGroups["sg-typography"] = tokens.typography.map(toKebabCase);
    conflictingClassGroups["sg-typography"] = [
      "font-size",
      "font-weight",
      "leading",
      "tracking",
    ];
  }

  return { extend: { classGroups, conflictingClassGroups, theme } };
};
