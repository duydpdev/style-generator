import type { z } from "zod";

import { ALIAS_VALUE_RE } from "./tokenGrammar";

/**
 * Report a `ZodIssue` for every alias value in `ownEntries` that either
 * doesn't match `^\$<TokenKey>$`, or references a key absent from
 * `validKeys`. `ownEntries` is the record the value is actually *declared*
 * in (the base record for the base pass, an override's own record for a
 * per-theme pass) — `validKeys` is the merged key set it may reference
 * (the override's own keys are always a subset of the base keys by the
 * time this runs, since the override validation rejects an override key
 * absent from the base record before reaching this check).
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string>} ownEntries - Entries whose own grammar/target is checked
 * @param {ReadonlySet<string>} validKeys - Keys a `$` alias may legally reference
 * @param {(key: string) => (string | number)[]} pathFor - Issue path builder for a given key
 * @returns {void}
 */
const checkAliasGrammarAndTargets = (
  ctx: z.RefinementCtx,
  ownEntries: Record<string, string>,
  validKeys: ReadonlySet<string>,
  pathFor: (key: string) => (string | number)[],
): void => {
  for (const [key, value] of Object.entries(ownEntries)) {
    if (!value.startsWith("$")) continue;

    const target = ALIAS_VALUE_RE.exec(value)?.[1];
    if (target === undefined) {
      ctx.addIssue({
        code: "custom",
        path: pathFor(key),
        message: `Alias value "${value}" must match ^\\$<TokenKey>$ (a "$" followed by a valid key)`,
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

/**
 * DFS the alias graph of `merged` (every key resolves via `merged[key]`,
 * following `$`-alias chains restricted to `keys`) and return the first
 * cycle found as an ordered chain (e.g. `["a", "b", "a"]`), or `undefined`
 * when the graph is acyclic.
 * @param {Record<string, string>} merged - Full key→value map for this theme/category pass
 * @param {ReadonlySet<string>} keys - Keys participating in the graph (= `Object.keys(merged)`)
 * @returns {string[] | undefined} Ordered cycle chain, or `undefined`
 */
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
    const target = !value?.startsWith("$")
      ? undefined
      : ALIAS_VALUE_RE.exec(value)?.[1];

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
 * Validate one category's alias graph for one theme pass (base, or a
 * single `themeAxes.<axis>.<variant>` override merged on top of base): alias
 * grammar/target-existence for `ownEntries`, then a cycle check over the
 * full `merged` graph. Reports at most one cycle issue, anchored at
 * whichever cycle member is actually declared in `ownEntries` (falling
 * back to the first cycle member when none is).
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string>} merged - Full key→value map for this pass (base, or base ⊕ override)
 * @param {Record<string, string>} ownEntries - Entries whose own grammar/target is checked (= `merged` for the base pass, the override's own record for a themed pass)
 * @param {(key: string) => (string | number)[]} pathFor - Issue path builder for a given key
 * @returns {void}
 */
export const validateCategoryAliasGraph = (
  ctx: z.RefinementCtx,
  merged: Record<string, string>,
  ownEntries: Record<string, string>,
  pathFor: (key: string) => (string | number)[],
): void => {
  const keys = new Set(Object.keys(merged));
  checkAliasGrammarAndTargets(ctx, ownEntries, keys, pathFor);

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

/**
 * Every axis's `html[data-<axis>]` block applies to the same element at
 * once, so a `$`-alias in one axis and another in a second axis can chain
 * into a cycle that no single `base ⊕ variant` pass sees (`x.one: a→$b`
 * with `y.two: b→$a` makes both custom properties invalid). Walk every
 * combination of at most one variant per axis (an axis may also be off),
 * merge them over `base` in axis declaration order (the last declaring axis
 * wins a key, exactly like the emitted CSS) and report the first cycle whose
 * edges come from at least two different axes — a cycle drawn from base +
 * one axis is already reported by {@link validateCategoryAliasGraph}.
 *
 * Axes whose variants hold no `$` value are skipped, and nothing runs unless
 * two axes carry aliases in this category.
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string> | undefined} base - Base record of the category
 * @param {Record<string, Record<string, Record<string, string> | undefined>>} axes - `themeAxes` projected on this category (`axis → variant → record`)
 * @param {string} category - Category key, used in the issue path
 * @returns {void}
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
