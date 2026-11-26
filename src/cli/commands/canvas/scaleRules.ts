import { asRecord } from "./parseHtml";
import type { Reporter } from "./ruleReport";
import type { LayeredStandard } from "./standardLayer";

/** One CSS length or time: its unit as written and its value in `px` / `ms`. */
interface Measured {
  step: string;
  raw: string;
  unit: string;
  base: number;
}

const UNIT_SCALE: Record<string, number> = { px: 1, rem: 16, ms: 1, s: 1000 };
const MEASURE = /^(\d+(?:\.\d+)?|\.\d+)(px|rem|ms|s)$/;

// A step's value as a number in px or ms; null when it is not one plain length or time.
function measure(step: string, value: unknown): Measured | null {
  if (typeof value !== "string") return null;
  const match = MEASURE.exec(value.trim());
  const unit = match?.[2];
  if (match === null || unit === undefined) return null;
  return {
    step,
    raw: value.trim(),
    unit,
    base: Number(match[1]) * (UNIT_SCALE[unit] ?? 1),
  };
}

// The unit groups of a family as `px (a, b), rem (c)`, in order of first use.
function unitGroups(items: readonly Measured[]): string {
  const groups = new Map<string, string[]>();
  for (const item of items)
    groups.set(item.unit, [...(groups.get(item.unit) ?? []), item.step]);
  return [...groups]
    .map(([unit, steps]) => `${unit} (${steps.join(", ")})`)
    .join(", ");
}

// Listed steps in list order, then the other steps in theme order.
function stepOrder(keys: string[], listed: readonly string[]): string[] {
  const inList = listed.filter((step) => keys.includes(step));
  return [...inList, ...keys.filter((key) => !listed.includes(key))];
}

interface FamilyContext {
  family: string;
  steps: readonly string[];
  path: string;
  reporter: Reporter;
}

// Values must not fall when read in list order; declared extra steps are not in the list, so they are skipped.
function orderRule(items: readonly Measured[], ctx: FamilyContext): void {
  const listed = items.filter((item) => ctx.steps.includes(item.step));
  listed.forEach((item, index) => {
    const before = listed[index - 1];
    if (before === undefined || item.base >= before.base) return;
    ctx.reporter.error(
      ctx.path,
      `${ctx.family}.${item.step} (${item.raw}) is below ${before.step} (${before.raw}); steps ascend in the order ${ctx.steps.join(", ")}`,
      "scale-order",
      `${ctx.family}.${item.step}`,
    );
  });
}

// Two steps with one value after rem and s are normalised.
function duplicateRule(items: readonly Measured[], ctx: FamilyContext): void {
  const first = new Map<number, Measured>();
  for (const item of items) {
    const earlier = first.get(item.base);
    if (earlier === undefined) {
      first.set(item.base, item);
      continue;
    }
    ctx.reporter.error(
      ctx.path,
      `${ctx.family}.${item.step} (${item.raw}) has the same value as ${earlier.step} (${earlier.raw})`,
      "scale-duplicate",
      `${ctx.family}.${item.step}`,
    );
  }
}

function sizeRules(
  record: Record<string, unknown>,
  ordered: readonly string[],
  ctx: FamilyContext,
): void {
  const items = ordered
    .map((step) => measure(step, record[step]))
    .filter((item) => item !== null);
  if (new Set(items.map((item) => item.unit)).size > 1)
    ctx.reporter.error(
      ctx.path,
      `${ctx.family} mixes units: ${unitGroups(items)}`,
      "scale-unit",
      ctx.family,
    );
  duplicateRule(items, ctx);
  orderRule(items, ctx);
}

function ordinalRules(
  record: Record<string, unknown>,
  ordered: readonly string[],
  ctx: FamilyContext,
): void {
  const items = ordered.flatMap((step) => {
    const value = record[step];
    return typeof value === "number"
      ? [{ step, raw: String(value), unit: "", base: value }]
      : [];
  });
  orderRule(items, ctx);
}

/**
 * The closed-scale rules over the standard's families. Only `size` and `ordinal`
 * values are compared; a compound value (shadow, cubic-bezier) never is.
 * @param {Record<string, unknown>} theme - Parsed theme JSON
 * @param {LayeredStandard} standard - The standard with the product's additions
 * @param {Reporter} reporter - Receives the lines
 * @param {string} path - `<theme>:1`, the location every line names
 */
export function scaleRules(
  theme: Record<string, unknown>,
  standard: LayeredStandard,
  reporter: Reporter,
  path: string,
): void {
  for (const [family, scale] of Object.entries(standard.scales ?? {})) {
    const record = asRecord(theme[family]);
    const keys = Object.keys(record);
    const extra = Object.keys(standard.scaleSteps?.[family] ?? {});
    const ctx = { family, steps: scale.steps, path, reporter };
    for (const key of keys)
      if (!scale.steps.includes(key) && !extra.includes(key))
        reporter.finding(
          path,
          `${family}.${key} is not a step of the closed scale (${scale.steps.join(", ")}); rename it, or declare it in scaleSteps.${family} with a reason`,
          "scale-name",
          `${family}.${key}`,
        );
    const ordered = stepOrder(keys, scale.steps);
    if (scale.kind === "size") sizeRules(record, ordered, ctx);
    if (scale.kind === "ordinal") ordinalRules(record, ordered, ctx);
  }
}
