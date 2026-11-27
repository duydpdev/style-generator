import type { z } from "zod";

import { parseAlias, parseAliasRef } from "./tokenGrammar";

// Report each alias in `ownEntries` (the record it is declared in) that is
// malformed or targets a key outside `validKeys` (the merged key set).
const checkAliasGrammarAndTargets = (
  ctx: z.RefinementCtx,
  ownEntries: Record<string, string>,
  validKeys: ReadonlySet<string>,
  allowAlpha: boolean,
  pathFor: (key: string) => (string | number)[],
): void => {
  for (const [key, value] of Object.entries(ownEntries)) {
    if (!value.startsWith("$")) continue;

    const ref = parseAliasRef(value);
    const target = ref?.key;
    if (ref === undefined || target === undefined) {
      ctx.addIssue({
        code: "custom",
        path: pathFor(key),
        message: `Alias value "${value}" must match ^\\$<TokenKey>$${allowAlpha ? " or ^\\$<TokenKey>/<1-100>$" : ""} (a "$" followed by a valid key)`,
      });
    } else if (ref.alpha !== undefined && !allowAlpha) {
      ctx.addIssue({
        code: "custom",
        path: pathFor(key),
        message: `Alias "${value}": the "$<key>/<n>" form is only allowed in colors`,
      });
    } else if (!validKeys.has(target)) {
      ctx.addIssue({
        code: "custom",
        path: pathFor(key),
        message: `Alias "${value}" references unknown key "${target}"`,
      });
    }
  }
};

// First alias cycle as an ordered chain (`["a", "b", "a"]`), or `undefined`.
const findAliasCycle = (
  merged: Record<string, string>,
  keys: ReadonlySet<string>,
): string[] | undefined => {
  const visiting = new Set<string>();
  const done = new Set<string>();

  const visit = (
    key: string,
    chain: readonly string[],
  ): string[] | undefined => {
    if (done.has(key)) return undefined;
    if (visiting.has(key)) {
      const cycleStart = chain.indexOf(key);
      return [...chain.slice(cycleStart), key];
    }

    const value = merged[key];
    const target = value === undefined ? undefined : parseAlias(value);

    if (target === undefined || !keys.has(target)) {
      done.add(key);
      return undefined;
    }

    visiting.add(key);
    const cycle = visit(target, [...chain, key]);
    visiting.delete(key);
    done.add(key);
    return cycle;
  };

  for (const key of keys) {
    const cycle = visit(key, []);
    if (cycle) return cycle;
  }
  return undefined;
};

/**
 * Validate one category's alias graph for one pass (base, or base ⊕ one override).
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string>} merged - Full key→value map for this pass
 * @param {Record<string, string>} ownEntries - Entries declared in this pass
 * @param {boolean} allowAlpha - Whether the category accepts the `/<n>` percent suffix
 * @param {(key: string) => (string | number)[]} pathFor - Issue path builder for a given key
 */
export const validateCategoryAliasGraph = (
  ctx: z.RefinementCtx,
  merged: Record<string, string>,
  ownEntries: Record<string, string>,
  allowAlpha: boolean,
  pathFor: (key: string) => (string | number)[],
): void => {
  const keys = new Set(Object.keys(merged));
  checkAliasGrammarAndTargets(ctx, ownEntries, keys, allowAlpha, pathFor);

  const cycle = findAliasCycle(merged, keys);
  if (!cycle) return;

  const anchorKey =
    cycle.find((key) => Object.hasOwn(ownEntries, key)) ?? cycle[0];
  if (anchorKey === undefined) return;

  ctx.addIssue({
    code: "custom",
    path: pathFor(anchorKey),
    message: `Alias cycle detected: ${cycle.join(" → ")}`,
  });
};

/** One `themeAxes.<axis>.<variant>` override of a single category. */
interface AxisVariantRecords {
  axis: string;
  variants: readonly (readonly [
    variant: string,
    record: Record<string, string>,
  ])[];
}

// Rationale: documents/architecture.md#validatecrossaxisaliascycles-why-alias-cycles-are-checked-across-axes
/**
 * Report the first alias cycle that needs variants of two or more axes active together.
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string> | undefined} base - Base record of the category
 * @param {Record<string, Record<string, Record<string, string> | undefined>>} axes - `themeAxes` projected on this category
 * @param {string} category - Category key, used in the issue path
 */
export const validateCrossAxisAliasCycles = (
  ctx: z.RefinementCtx,
  base: Record<string, string> | undefined,
  axes: Record<string, Record<string, Record<string, string> | undefined>>,
  category: string,
): void => {
  const aliasAxes: AxisVariantRecords[] = [];
  for (const [axis, variants] of Object.entries(axes)) {
    const withRecords = Object.entries(variants).flatMap(([variant, record]) =>
      record && Object.values(record).some((value) => value.startsWith("$"))
        ? [[variant, record] as const]
        : [],
    );
    if (withRecords.length > 0) aliasAxes.push({ axis, variants: withRecords });
  }
  if (aliasAxes.length < 2) return;

  const keys = new Set(Object.keys(base ?? {}));
  const chosen: { axisIndex: number; axis: string; variant: string }[] = [];

  const check = (): boolean => {
    if (chosen.length < 2) return false;

    const merged: Record<string, string> = { ...base };
    const sourceAxis = new Map<string, number>();
    for (const { axisIndex, axis, variant } of chosen) {
      const record = axes[axis]?.[variant] ?? {};
      for (const [key, value] of Object.entries(record)) {
        merged[key] = value;
        sourceAxis.set(key, axisIndex);
      }
    }

    const cycle = findAliasCycle(merged, keys);
    if (!cycle) return false;

    const cycleAxes = new Set<number>();
    for (const key of cycle) {
      const source = sourceAxis.get(key);
      if (source !== undefined) cycleAxes.add(source);
    }
    if (cycleAxes.size < 2) return false;

    const involved = chosen.filter(({ axisIndex }) => cycleAxes.has(axisIndex));
    const latest = involved[involved.length - 1];
    const anchorKey = cycle.find(
      (key) => sourceAxis.get(key) === latest?.axisIndex,
    );
    if (!latest || anchorKey === undefined) return false;

    const coActive = involved
      .map(({ axis, variant }) => `themeAxes.${axis}.${variant}`)
      .join(" and ");
    ctx.addIssue({
      code: "custom",
      path: ["themeAxes", latest.axis, latest.variant, category, anchorKey],
      message:
        `Alias cycle detected when ${coActive} are active together: ` +
        `${cycle.join(" → ")} — axes apply to the same element, so these ` +
        "aliases chain across axes; point one of them at a literal value.",
    });
    return true;
  };

  const walk = (axisIndex: number): boolean => {
    const current = aliasAxes[axisIndex];
    if (!current) return check();
    if (walk(axisIndex + 1)) return true;
    for (const [variant] of current.variants) {
      chosen.push({ axisIndex, axis: current.axis, variant });
      const found = walk(axisIndex + 1);
      chosen.pop();
      if (found) return true;
    }
    return false;
  };
  walk(0);
};
