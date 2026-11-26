import { toKebabCase } from "../../shared/helpers";

/** The slice of `DesignTokens.Web` the extension reads. */
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

/** Structural shape of a `tailwind-merge` v3 `extendTailwindMerge(...)` argument. */
// Declared, not imported: `tailwind-merge` is the app's dependency, so the published types must not name it.
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

// Local copies of registry prefixes (importing them would grow the `./tokens` chunk);
// `extendTailwindMerge.test.ts` pins both tables to the registry.
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

// [token field, tailwind-merge group, class prefix]. The `min-h`/`max-h` and `backdrop-opacity`
// rows have no registry prefix: the same `@theme` variables feed those utilities too.
const SCALE_GROUPS = [
  ["motionDuration", "duration", "duration"],
  ["motionEasing", "ease", "ease"],
  ["controlHeight", "h", "h-control"],
  ["controlHeight", "min-h", "min-h-control"],
  ["controlHeight", "max-h", "max-h-control"],
  ["iconSize", "size", "size-icon"],
  ["opacity", "opacity", "opacity"],
  ["opacity", "backdrop-opacity", "backdrop-opacity"],
  ["zIndex", "z", "z"],
] as const;

/**
 * Builds the `tailwind-merge` v3 extension that teaches `twMerge` a theme's
 * own classes (`border-thin`, `rounded-pill`, `text-10-light`, `h-control-md`).
 * A later typography class removes earlier font-size/weight/leading/tracking classes.
 * @param {TailwindMergeTokens} tokens - `generate().tokens.Web` or `createDesignTokens().DesignTokens.Web`
 * @returns {TailwindMergeExtension} Argument for `extendTailwindMerge`
 */
// Rationale: documents/architecture.md#createtailwindmergeextension-which-groups-each-category-extends
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
