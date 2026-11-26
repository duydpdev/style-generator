import { asRecord } from "./parseHtml";
import { additionsFromFullCopy, type Additions } from "./standardLayer";
import type { Standard } from "./standardSchema";
import { roleOf } from "./themeRules";

/**
 * Colour roles the theme uses that the packaged grammar does not declare,
 * each without a description (the next check reports that).
 * @param {unknown} theme - Parsed theme JSON
 * @param {Standard} base - The packaged standard
 * @returns {string[]} Role names, sorted
 */
function themeRoles(theme: unknown, base: Standard): string[] {
  const grammar = base.grammar;
  if (grammar === undefined) return [];
  const declared = new Set([...grammar.roles, ...grammar.neutral]);
  const roles = new Set<string>();
  for (const key of Object.keys(asRecord(asRecord(theme).colors))) {
    const role = roleOf(key, grammar);
    if (role !== null && !declared.has(role)) roles.add(role);
  }
  return [...roles].sort((a, b) => a.localeCompare(b));
}

/**
 * Steps the theme defines in a closed scale family beyond the packaged list,
 * each with an empty reason that the next check rejects until it is written.
 * @param {unknown} theme - Parsed theme JSON
 * @param {Standard} base - The packaged standard
 * @returns {NonNullable<Additions["scaleSteps"]>} Family → extra step → empty reason
 */
function themeScaleSteps(
  theme: unknown,
  base: Standard,
): NonNullable<Additions["scaleSteps"]> {
  const out: NonNullable<Additions["scaleSteps"]> = {};
  for (const [family, scale] of Object.entries(base.scales ?? {})) {
    const extra = Object.keys(asRecord(asRecord(theme)[family])).filter(
      (step) => !scale.steps.includes(step),
    );
    if (extra.length > 0)
      out[family] = Object.fromEntries(extra.map((s) => [s, { reason: "" }]));
  }
  return out;
}

/**
 * Rewrites a full copy of the manifest as an additions file.
 * @param {unknown} raw - The parsed full copy
 * @param {unknown} theme - Parsed theme JSON of the product
 * @param {Standard} base - The packaged standard
 * @returns {Additions} The additions: roles, extra scale steps, product boards, `alphaScale`
 */
export function migrateAdditions(
  raw: unknown,
  theme: unknown,
  base: Standard,
): Additions {
  const copy = additionsFromFullCopy(raw, base);
  const roles = {
    ...Object.fromEntries(
      themeRoles(theme, base).map((r) => [r, { description: "" }]),
    ),
    ...copy.roles,
  };
  const scaleSteps = themeScaleSteps(theme, base);
  return {
    ...(Object.keys(roles).length > 0 && { roles }),
    ...(Object.keys(scaleSteps).length > 0 && { scaleSteps }),
    ...(copy.alphaScale !== undefined && { alphaScale: copy.alphaScale }),
    ...(copy.pages !== undefined && { pages: copy.pages }),
    ...(copy.boards !== undefined && { boards: copy.boards }),
    ...(copy.content !== undefined && { content: copy.content }),
  };
}
