import { forEachAxisVariant } from "../../core/forEachAxisVariant";
import type { ThemeConfig, ThemeOverride } from "../../core/themeSchema";
import { cssVarCategories } from "../../features/registry/builtInCategories";

// Trimmed and lowercased (`#FFF` ≡ `#fff`); `undefined` for a non-string or a `$alias`.
const literalOf = (value: unknown): string | undefined =>
  typeof value === "string" && !value.trim().startsWith("$")
    ? value.trim().toLowerCase()
    : undefined;

// The first other base key holding `literal` that no override of any axis redefines.
// Rationale: documents/architecture.md#aliashintsts-why-a-redefined-base-key-is-never-suggested
const aliasTarget = (
  base: Record<string, unknown>,
  key: string,
  literal: string,
  redefined: ReadonlySet<string>,
): string | undefined =>
  Object.keys(base).find(
    (candidate) =>
      candidate !== key &&
      !redefined.has(candidate) &&
      literalOf(base[candidate]) === literal,
  );

/**
 * Hints for `themeAxes` overrides that repeat as a literal the value another
 * base key of an alias-taking category holds, so a `$alias` would track it.
 * Warnings only: they never change `doctor`'s exit code.
 * @param {ThemeConfig} theme - A theme that already passed `ThemeSchema`
 * @returns {string[]} One message per redundant literal, in declaration order
 */
export function findAliasHints(theme: ThemeConfig): string[] {
  const hints: string[] = [];
  const overrides: (readonly [string, ThemeOverride])[] = [];
  forEachAxisVariant(theme.themeAxes, (axis, variant, override) => {
    overrides.push([`${axis}.${variant}`, override]);
  });
  const redefinedBy = (category: (typeof cssVarCategories)[number]["key"]) =>
    new Set(overrides.flatMap(([, o]) => Object.keys(o[category] ?? {})));
  const aliasCategories = cssVarCategories.filter((d) => !d.literalScale);
  for (const [where, override] of overrides) {
    for (const { key: category } of aliasCategories) {
      const base: Record<string, unknown> = theme[category] ?? {};
      const redefined = redefinedBy(category);
      for (const [key, value] of Object.entries(override[category] ?? {})) {
        const literal = literalOf(value);
        const target =
          literal === undefined
            ? undefined
            : aliasTarget(base, key, literal, redefined);
        if (target === undefined) continue;
        hints.push(
          `Override ${where}.${category}.${key} repeats base value ${String(value).trim()} → use alias "$${target}"`,
        );
      }
    }
  }
  return hints;
}
