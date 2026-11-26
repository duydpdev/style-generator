import type { StyleGeneratorOptions } from "./Options";
import { resolveTokenOptions } from "./resolveTokenOptions";
import type { ResolvedTokenOptions } from "./resolveTokenOptions";

/** A breakpoint resolved to its screen width. */
export interface ResolvedBreakpoint {
  key: string;
  value: string;
  /** The leading number of `value`, unit ignored (`parseFloat`). */
  numericValue: number;
}

/** One `coverage.colors.opacities` group with its steps sorted ascending. */
export interface ResolvedOpacityGroup {
  /** Position in the raw `opacities` array, for error paths. */
  index: number;
  steps: readonly number[];
  /** `undefined`: the rule's covered prefixes. */
  prefixes: readonly string[] | undefined;
  /** `undefined`: the rule's covered keys. */
  keys: readonly string[] | undefined;
}

type RawOpacityEntry =
  | number
  | {
      steps: readonly number[];
      prefixes?: readonly string[];
      keys?: readonly string[];
    };

/** One category's `coverage` entry with every default filled in. */
export interface ResolvedCoverageRule {
  /** `false`: the category emits no `@source inline` lines. */
  enabled: boolean;
  /** Class prefixes to keep; `undefined` keeps every prefix of the category. */
  prefixes: readonly string[] | undefined;
  keys: "aliased" | "all";
  /** Plain opacity-modifier steps, ascending. */
  opacities: readonly number[];
  opacityGroups: readonly ResolvedOpacityGroup[];
}

/** `StyleGeneratorOptions` with every default applied once; never re-apply `?? DEFAULT_X` downstream. */
export interface ResolvedOptions extends ResolvedTokenOptions {
  // Rationale: documents/architecture.md#stylegeneratoroptions-why-each-option-is-declared-in-four-files
  /** Breakpoints with a screen width, ascending; empty when `enableResponsive` is `false`. */
  sortedBreakpoints: readonly ResolvedBreakpoint[];
  enableResponsive: boolean;
  typographyCssVarDriven: boolean;
  /** Only the categories `options.coverage` mentions; an absent one covers everything. */
  coverage: Readonly<Record<string, ResolvedCoverageRule>>;
  /** As written (order and duplicates kept); the CSS generator emits each name once. */
  resetTailwindDefaults: readonly ("colors" | "radius" | "shadow")[];
}

const sortBreakpoints = (
  breakpoints: readonly string[],
  screens: Readonly<Record<string, string>>,
): ResolvedBreakpoint[] =>
  breakpoints
    .flatMap((key) => {
      const value = screens[key];
      return value === undefined
        ? []
        : [{ key, value, numericValue: Number.parseFloat(value) }];
    })
    .sort((a, b) => a.numericValue - b.numericValue);

const resolveCoverage = (
  coverage: StyleGeneratorOptions["coverage"],
): ResolvedOptions["coverage"] => {
  const resolved: Record<string, ResolvedCoverageRule> = {};
  for (const [key, rule] of Object.entries(coverage ?? {})) {
    if (typeof rule === "boolean") {
      resolved[key] = {
        enabled: rule,
        prefixes: undefined,
        keys: "all",
        opacities: [],
        opacityGroups: [],
      };
      continue;
    }
    const entries: readonly RawOpacityEntry[] = rule.opacities ?? [];
    resolved[key] = {
      enabled: true,
      prefixes: rule.prefixes,
      keys: rule.keys ?? "all",
      opacities: entries
        .filter((entry): entry is number => typeof entry === "number")
        .sort((a, b) => a - b),
      opacityGroups: entries.flatMap((entry, index) =>
        typeof entry === "number"
          ? []
          : [
              {
                index,
                steps: [...entry.steps].sort((a, b) => a - b),
                prefixes: entry.prefixes,
                keys: entry.keys,
              },
            ],
      ),
    };
  }
  return resolved;
};

/**
 * Resolve every option default once; pure, expects options that passed `StyleGeneratorOptionsSchema`.
 * @param {StyleGeneratorOptions} [options] - Raw generator options
 * @returns {ResolvedOptions} Options with every default applied
 */
export const resolveOptions = (
  options: StyleGeneratorOptions = {},
): ResolvedOptions => {
  const base = resolveTokenOptions(options);
  const enableResponsive = options.enableResponsive !== false;

  return {
    ...base,
    sortedBreakpoints: enableResponsive
      ? sortBreakpoints(base.breakpoints, base.screens)
      : [],
    enableResponsive,
    typographyCssVarDriven: options.typography?.cssVarDriven === true,
    coverage: resolveCoverage(options.coverage),
    resetTailwindDefaults: options.resetTailwindDefaults ?? [],
  };
};
