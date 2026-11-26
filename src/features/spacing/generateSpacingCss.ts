import { resolveOptions } from "../../core/resolveOptions";
import type {
  ResolvedBreakpoint,
  ResolvedOptions,
} from "../../core/resolveOptions";
import { cssBlock } from "../../shared/cssBlock";

// Ascending `var(--sg-sp-<key>-<bp>, …)` chain up to `uptoIndex`, accumulating every narrower breakpoint.
const buildFallbackChain = (
  key: string,
  sortedBreakpoints: readonly ResolvedBreakpoint[],
  uptoIndex: number,
): string => {
  let chain = `var(--sg-sp-${key})`;
  for (let j = 0; j <= uptoIndex; j++) {
    const bp = sortedBreakpoints[j];
    if (bp === undefined) continue;
    chain = `var(--sg-sp-${key}-${bp.key}, ${chain})`;
  }
  return chain;
};

// One `@utility sp-<key>` block: base declarations plus one `@media` per breakpoint.
const buildUtilityBlock = (
  key: string,
  cssProps: readonly string[],
  sortedBreakpoints: readonly ResolvedBreakpoint[],
): string => {
  const baseSection = cssProps
    .map((cssProp) => `  ${cssProp}: var(--sg-sp-${key});`)
    .join("\n");

  const mediaSections = sortedBreakpoints.map((bp, i) => {
    const chain = buildFallbackChain(key, sortedBreakpoints, i);
    const lines = cssProps
      .map((cssProp) => `    ${cssProp}: ${chain};`)
      .join("\n");
    return cssBlock(`@media (width >= ${bp.value})`, lines, "  ");
  });

  return cssBlock(
    `@utility sp-${key}`,
    [baseSection, ...mediaSections].join("\n\n"),
  );
};

// `@property` blocks for the base var and each breakpoint var, deliberately without `initial-value`.
const buildPropertyBlocks = (
  key: string,
  sortedBreakpoints: readonly ResolvedBreakpoint[],
): string[] => {
  const names = [
    `--sg-sp-${key}`,
    ...sortedBreakpoints.map((bp) => `--sg-sp-${key}-${bp.key}`),
  ];
  return names.map((name) =>
    cssBlock(`@property ${name}`, '  syntax: "*";\n  inherits: false;'),
  );
};

/**
 * Generates the `.sp-*` spacing utilities as `@utility` blocks with their
 * breakpoint fallback chains, plus an `@property` registration per variable.
 * @param {Pick<ResolvedOptions, "spacing" | "sortedBreakpoints">} [options] - Resolved generator options
 * @returns {string} CSS string, empty when spacing generation is disabled
 */
// Rationale: documents/architecture.md#generatespacingcss-utility-blocks-fallback-chains-and-property
export const generateSpacingCss = (
  options: Pick<
    ResolvedOptions,
    "spacing" | "sortedBreakpoints"
  > = resolveOptions(),
): string => {
  if (!options.spacing.enabled) return "";

  const spacingProps = options.spacing.properties;
  const spacingKeys = Object.keys(spacingProps);
  const sortedBreakpoints = options.sortedBreakpoints;

  const utilityBlocks = spacingKeys.flatMap((key) => {
    const cssProps = spacingProps[key];
    return cssProps === undefined
      ? []
      : [buildUtilityBlock(key, cssProps, sortedBreakpoints)];
  });
  const propertyBlocks = spacingKeys.flatMap((key) =>
    buildPropertyBlocks(key, sortedBreakpoints),
  );

  return [...utilityBlocks, ...propertyBlocks].join("\n\n") + "\n";
};
