import { cssVarCategories } from "../features/registry/builtInCategories";

import { forEachAxisVariant } from "./forEachAxisVariant";
import type { ThemeConfig } from "./themeSchema";
import { parseAlias } from "./tokenGrammar";

/** A CSS-var category key (`colors`, `shadows`, …). */
type ThemeCssCategory = (typeof cssVarCategories)[number]["key"];

/** The one issue shape the `axes` checks report. */
export interface AxesIssue {
  code: "custom";
  path: (string | number)[];
  message: string;
}

/**
 * Where the `axes` and reset checks report to: a `z.RefinementCtx` satisfies
 * it, and so does the plain collector `assertThemeOptions` uses.
 */
export interface AxesIssueCtx {
  addIssue: (issue: AxesIssue) => void;
}

/** One `holder: "$target"` declaration and where it was written. */
interface AliasDecl {
  holder: string;
  target: string;
  /** `"base"` or `"<axis>.<variant>"`. */
  where: string;
}

/** A declaration that would not follow the variant it is nested in. */
interface StaleHolder extends AliasDecl {
  /** The key the variant overrides that this holder depends on (maybe via a chain). */
  root: string;
}

/**
 * Every `$`-alias declaration of one category in the base theme and in every
 * variant of every axis except `skip`: a holder declared anywhere can sit on
 * an ancestor element of the one a variant is applied to.
 * @param {ThemeConfig} theme - Theme already parsed by `ThemeSchema`
 * @param {string} category - CSS-var category key
 * @param {object} skip - The variant override being checked (its own entries are "re-declared", not stale)
 * @returns {AliasDecl[]} Declarations, base first then variants in declaration order
 */
const collectAliasDecls = (
  theme: ThemeConfig,
  category: ThemeCssCategory,
  skip: object,
): AliasDecl[] => {
  const decls: AliasDecl[] = [];
  const add = (
    record: Readonly<Record<string, string>> | undefined,
    where: string,
  ): void => {
    for (const [holder, value] of Object.entries(record ?? {})) {
      const target = parseAlias(value);
      if (target !== undefined) decls.push({ holder, target, where });
    }
  };

  add(theme[category], "base");
  forEachAxisVariant(theme.themeAxes, (axis, variant, override) => {
    if (override !== skip) add(override[category], `${axis}.${variant}`);
  });
  return decls;
};

/**
 * The declarations that alias a key the variant overrides (directly, or
 * through a chain of stale holders) without being re-declared in it, in
 * discovery order. A stale holder is itself a changed key, so declarations
 * aliasing it follow (fixpoint; each holder is reported once, so it ends).
 * @param {AliasDecl[]} decls - Candidate alias declarations of the category
 * @param {Readonly<Record<string, string>>} overrideRecord - The variant's record of the same category
 * @returns {StaleHolder[]} Stale holders
 */
const findStaleHolders = (
  decls: readonly AliasDecl[],
  overrideRecord: Readonly<Record<string, string>>,
): StaleHolder[] => {
  // changed key → the overridden key it traces back to
  const rootOf = new Map(Object.keys(overrideRecord).map((key) => [key, key]));
  const stale: StaleHolder[] = [];
  for (let grew = true; grew; ) {
    grew = false;
    for (const decl of decls) {
      const root = rootOf.get(decl.target);
      if (root === undefined || rootOf.has(decl.holder)) continue;
      rootOf.set(decl.holder, root);
      stale.push({ ...decl, root });
      grew = true;
    }
  }
  return stale;
};

const staleHolderMessage = (
  category: ThemeCssCategory,
  variantLabel: string,
  { holder, target, root, where }: StaleHolder,
): string => {
  const why =
    target === root
      ? `variant "${variantLabel}" overrides "${target}"`
      : `"${target}" is itself stale in variant "${variantLabel}" (it follows the overridden "${root}")`;
  return (
    `theme.${category}.${holder} is the alias "$${target}" (declared in ${where}) and ${why}, ` +
    `but an alias is computed where it is declared (:root), so with axes.scope "element" it would not follow the variant — ` +
    `re-declare "${holder}" in this variant (a literal or "$${target}") or use axes.scope "root".`
  );
};

/**
 * Check a theme against `axes.scope: "element"`. These checks need both the
 * theme and the options, so they cannot live in `ThemeSchema` (which is
 * options-independent and published as JSON Schema).
 *
 * With `scope: "element"` a `themeAxes.<axis>.<variant>` block applies to an
 * arbitrary element, but a `$`-alias `var(--sg-<category>-<target>)` is
 * computed where the custom property is DECLARED (`:root`, or the ancestor
 * element a variant already applies to). So when a variant overrides `T` and
 * an entry `H: "$T"`, written in the base theme or in any other variant of
 * any axis, is not re-declared in the same variant, `H` keeps the other
 * value inside the scoped element — a silently stale token. Runs over every
 * CSS-var category (`$base` in `shadows` is an alias too) and follows the
 * chain: a stale holder is itself a changed key, so an entry aliasing it is
 * reported as well. Each stale holder is reported at
 * `["themeAxes", axis, variant, category, key]`, `key` being the overridden
 * key the staleness traces back to.
 * @param {AxesIssueCtx} ctx - Where issues are reported
 * @param {ThemeConfig} theme - Theme already parsed by `ThemeSchema`
 * @returns {void}
 */
export const checkElementScopeAliases = (
  ctx: AxesIssueCtx,
  theme: ThemeConfig,
): void => {
  forEachAxisVariant(theme.themeAxes, (axis, variant, override) => {
    for (const { key: category } of cssVarCategories) {
      const overrideRecord = override[category];
      if (!overrideRecord) continue;
      const decls = collectAliasDecls(theme, category, override);
      for (const stale of findStaleHolders(decls, overrideRecord)) {
        ctx.addIssue({
          code: "custom",
          path: ["themeAxes", axis, variant, category, stale.root],
          message: staleHolderMessage(category, `${axis}.${variant}`, stale),
        });
      }
    }
  });
};
