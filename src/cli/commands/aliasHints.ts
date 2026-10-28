import type { ThemeConfig } from "../../core/themeSchema";
import { cssVarCategories } from "../../features/registry/builtInCategories";

/**
 * A comparable literal: trimmed and lowercased, `undefined` for a non-string
 * or a `$alias`.
 * @param {unknown} value - A category value
 * @returns {string | undefined} The comparable form
 */
const literalOf = (value: unknown): string | undefined =>
  typeof value === "string" && !value.trim().startsWith("$")
    ? value.trim().toLowerCase()
    : undefined;

/**
 * The first key of `base`, other than `key`, whose literal equals `literal`
 * and that no override redefines. A redefined candidate would resolve to its
 * override value under the active axis (`var(--sg-color-text)` is the dark
 * value under `data-theme="dark"`), so aliasing it would change the colour.
 * @param {Record<string, unknown>} base - The base record of the category
 * @param {string} key - The overridden key (never its own alias target)
 * @param {string} literal - The comparable override value
 * @param {ReadonlySet<string>} redefined - Keys any variant of any axis overrides in this category
 * @returns {string | undefined} The base key to alias, if any
 */
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
 * Hints for `themeAxes` overrides that repeat, as a literal, the value a
 * **different** key of the same base category already holds — the override
 * could point at that key with a `$alias` instead (`"$blue500"`), so a later
 * palette change in the base reaches the variant too. Covers every category
 * that emits a `--sg-*` variable, not only colors.
 *
 * An override equal to its own base key is a redundant override, not an alias
 * candidate, and is skipped. Values are compared trimmed and lowercased
 * (`#FFF` ≡ `#fff`); only the first matching base key is named. A base key
 * that ANY variant of ANY axis redefines (in that category) is never
 * suggested: axes stack on `html`, so its variable would change under the
 * active variant and the alias would not repeat the literal. Warnings
 * only: they never change `doctor`'s exit code.
 * @param {ThemeConfig} theme - A theme that already passed `ThemeSchema`
 * @returns {string[]} One message per redundant literal, in declaration order
 */
export function findAliasHints(theme: ThemeConfig): string[] {
  const hints: string[] = [];
  const overrides = Object.entries(theme.themeAxes ?? {}).flatMap(
    ([axis, variants]) =>
      Object.entries(variants).map(
        ([variant, override]) => [`${axis}.${variant}`, override] as const,
      ),
  );
  const redefinedBy = (category: (typeof cssVarCategories)[number]["key"]) =>
    new Set(overrides.flatMap(([, o]) => Object.keys(o[category] ?? {})));
  for (const [where, override] of overrides) {
    for (const { key: category } of cssVarCategories) {
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
          `Override ${where}.${category}.${key} repeats base value ${value.trim()} → use alias "$${target}"`,
        );
      }
    }
  }
  return hints;
}
