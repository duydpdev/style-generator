import { toKebabCase } from "./helpers";

/**
 * Token families of the design-system page and the prefix each puts before the
 * kebab-cased theme key. They share one `--<name>` namespace, so two families
 * whose names meet on one string collide. `color` has no prefix.
 */
export const DS_FAMILY_PREFIX = {
  colors: "",
  borderRadius: "radius-",
  shadows: "shadow-",
  borderWidth: "border-",
  backdropBlurs: "blur-",
} as const;

type ThemeFamily = keyof typeof DS_FAMILY_PREFIX;

/**
 * The colour keys the design-system cover page reads (`{{v:<key>}}` in
 * the cover template in `src/cli/commands/ds/templates.ts`), so a theme that holds them is not unused.
 */
export const DS_COVER_KEYS: readonly string[] = [
  "background",
  "foreground",
  "primary",
  "success",
  "warning",
];

/** One token name on the design-system page and where it comes from. */
export interface DsTokenName {
  name: string;
  /** The theme category, `opacity`, `breakpoints` or `spacing`. */
  family: string;
  /** The key inside that category (the step number for `opacity`). */
  key: string;
}

/** The parts of a theme, config and usage file that name tokens. */
export interface DsTokenNameInput {
  theme: Partial<Record<ThemeFamily, Record<string, unknown> | undefined>>;
  /** `style-gen.config.json`: opacity steps and breakpoints add tokens the theme does not hold. */
  config?: {
    coverage?: {
      colors?: {
        opacities?: readonly (number | { steps: readonly number[] })[];
      };
    };
    breakpoints?: readonly string[];
  };
  /** `ds.usage.json`: spacing tokens are named there, verbatim. */
  usage?: { spacing?: readonly { name: string }[] };
}

const opacitySteps = (
  entries: readonly (number | { steps: readonly number[] })[] = [],
): number[] => [
  ...new Set(
    entries.flatMap((entry) =>
      typeof entry === "number" ? [entry] : [...entry.steps],
    ),
  ),
];

/**
 * Every token name the design-system page will carry, config-driven and usage-driven ones included.
 * @param {DsTokenNameInput} input - Theme, config and usage file
 * @returns {DsTokenName[]} One entry per token, in family order
 */
export function dsTokenNames({
  theme,
  config,
  usage,
}: DsTokenNameInput): DsTokenName[] {
  const themed = (Object.keys(DS_FAMILY_PREFIX) as ThemeFamily[]).flatMap(
    (family) =>
      Object.keys(theme[family] ?? {}).map((key) => ({
        name: `${DS_FAMILY_PREFIX[family]}${toKebabCase(key)}`,
        family,
        key,
      })),
  );
  const opacities = opacitySteps(config?.coverage?.colors?.opacities).map(
    (step) => ({
      name: `opacity-${String(step)}`,
      family: "opacity",
      key: String(step),
    }),
  );
  const breakpoints = (config?.breakpoints ?? []).map((key) => ({
    name: `bp-${key}`,
    family: "breakpoints",
    key,
  }));
  const spacing = (usage?.spacing ?? []).map(({ name }) => ({
    name,
    family: "spacing",
    key: name,
  }));
  return [...themed, ...opacities, ...breakpoints, ...spacing];
}

/**
 * The names two or more tokens share.
 * @param {DsTokenName[]} names - The result of `dsTokenNames`
 * @returns {{ name: string; tokens: DsTokenName[] }[]} One entry per shared name, in first-use order
 */
export function dsNameCollisions(
  names: readonly DsTokenName[],
): { name: string; tokens: DsTokenName[] }[] {
  const byName = new Map<string, DsTokenName[]>();
  for (const token of names)
    byName.set(token.name, [...(byName.get(token.name) ?? []), token]);
  return [...byName]
    .filter(([, tokens]) => tokens.length > 1)
    .map(([name, tokens]) => ({ name, tokens }));
}
