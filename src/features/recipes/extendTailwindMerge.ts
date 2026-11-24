import { toKebabCase } from "../../shared/helpers";

/**
 * The slice of the design tokens the extension reads. `generate().tokens.Web`
 * and `createDesignTokens().DesignTokens.Web` are assignable to it; `colors`
 * and `fontFamily` are not needed (see {@link createTailwindMergeExtension}).
 */
export interface TailwindMergeTokens {
  readonly typography: readonly string[];
  readonly shadows: readonly string[];
  readonly backdropBlurs: readonly string[];
  readonly borderRadius: readonly string[];
  readonly borderWidth: readonly string[];
  readonly motionDuration?: readonly string[];
  readonly motionEasing?: readonly string[];
  readonly controlHeight?: readonly string[];
  readonly iconSize?: readonly string[];
  readonly opacity?: readonly string[];
  readonly zIndex?: readonly string[];
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
 * The scale token fields, each with the `tailwind-merge` class group its
 * utilities belong to and the class prefix the registry emits. A local
 * literal table for the same reason as {@link BORDER_WIDTH_PREFIXES};
 * `extendTailwindMerge.test.ts` pins the prefixes to the registry.
 * `--height-control-*` also feeds Tailwind's `min-h-*`/`max-h-*`, so
 * `controlHeight` has two extra rows the registry does not cover (an app
 * that writes `min-h-control-md` gets it from its own source scan).
 */
const SCALE_GROUPS = [
  ["motionDuration", "duration", "duration"],
  ["motionEasing", "ease", "ease"],
  ["controlHeight", "h", "h-control"],
  ["controlHeight", "min-h", "min-h-control"],
  ["controlHeight", "max-h", "max-h-control"],
  ["iconSize", "size", "size-icon"],
  ["opacity", "opacity", "opacity"],
  ["zIndex", "z", "z"],
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
 * - `shadows`, `backdropBlurs` and `borderWidth` (incl. side, logical and
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
 * - the scale tokens (`motionDuration`, `motionEasing`, `controlHeight`,
 *   `iconSize`, `opacity`, `zIndex`; each optional, an absent one adds
 *   nothing) extend `duration`, `ease`, `h`, `min-h`, `max-h`, `size`,
 *   `opacity` and `z`, so `h-control-md` replaces an earlier `h-10`.
 * - `colors` and `fontFamily` are deliberately absent: the default `color`
 *   and `font-family` groups already accept any value.
 *
 * Variants (`hover:`, `md:`) are stripped by `tailwind-merge` before group
 * lookup, so only bare class parts are listed. Empty token lists emit no
 * group.
 * @param {TailwindMergeTokens} tokens - `generate().tokens.Web` or `createDesignTokens().DesignTokens.Web`
 * @returns {TailwindMergeExtension} Argument for `extendTailwindMerge`
 * @example
 * import { extendTailwindMerge } from "tailwind-merge";
 *
 * const twMerge = extendTailwindMerge(createTailwindMergeExtension(tokens));
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
  addGroup("backdrop-blur", "backdrop-blur", tokens.backdropBlurs);
  if (tokens.borderRadius.length > 0) {
    theme.radius = tokens.borderRadius.map(toKebabCase);
  }
  for (const prefix of BORDER_WIDTH_PREFIXES) {
    addGroup(prefix.replace(/^border/, "border-w"), prefix, tokens.borderWidth);
  }
  for (const [field, id, prefix] of SCALE_GROUPS) {
    addGroup(id, prefix, tokens[field] ?? []);
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
