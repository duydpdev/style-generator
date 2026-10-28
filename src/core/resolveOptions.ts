import type { StyleGeneratorOptions } from "./Options";
import { resolveTokenOptions } from "./resolveTokenOptions";
import type { ResolvedTokenOptions } from "./resolveTokenOptions";

/** A breakpoint resolved to its screen width. */
export interface ResolvedBreakpoint {
  key: string;
  /** The screen width as written (`"768px"`, `"48rem"`). */
  value: string;
  /** The leading number of `value`, unit ignored (`parseFloat`). */
  numericValue: number;
}

/** One category's `coverage` entry with every default filled in. */
export interface ResolvedCoverageRule {
  /** `false`: the category emits no `@source inline` lines. */
  enabled: boolean;
  /** Class prefixes to keep; `undefined` keeps every prefix of the category. */
  prefixes: readonly string[] | undefined;
  /** `"aliased"` keeps only the keys whose value is a `$<key>` alias. */
  keys: "aliased" | "all";
}

/**
 * `StyleGeneratorOptions` with every default applied once, so the CSS and
 * token pipelines read plain values instead of each repeating
 * `options.x ?? DEFAULT_X`.
 */
export interface ResolvedOptions extends ResolvedTokenOptions {
  /**
   * `breakpoints` that have a screen width, ascending by width — the order of
   * the spacing `@media` fallback chain. Empty when `enableResponsive` is
   * `false`.
   */
  sortedBreakpoints: readonly ResolvedBreakpoint[];
  enableResponsive: boolean;
  typographyCssVarDriven: boolean;
  extraSources: readonly string[];
  /**
   * Only the categories `options.coverage` mentions, by category key; a
   * category that is absent here uses the default (everything).
   */
  coverage: Readonly<Record<string, ResolvedCoverageRule>>;
  /**
   * How `themeAxes` variants are switched on: the axis → attribute-name map
   * (`{}`: every axis uses `data-<axis-kebab>`) and where the selector
   * applies.
   */
  axes: {
    readonly attribute: Readonly<Record<string, string>>;
    readonly scope: "root" | "element";
  };
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
    resolved[key] =
      typeof rule === "boolean"
        ? { enabled: rule, prefixes: undefined, keys: "all" }
        : { enabled: true, prefixes: rule.prefixes, keys: rule.keys ?? "all" };
  }
  return resolved;
};

/**
 * Resolve every default of the generator options exactly once. Pure: the
 * same options always give an equal result, and `options` is not mutated.
 * Expects options that already passed `StyleGeneratorOptionsSchema`.
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
    extraSources: options.extraSources ?? [],
    coverage: resolveCoverage(options.coverage),
    axes: {
      attribute: options.axes?.attribute ?? {},
      scope: options.axes?.scope ?? "root",
    },
  };
};
