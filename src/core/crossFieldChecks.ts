import { z } from "zod";

import { cssVarCategories } from "../features/registry/builtInCategories";
import { axisAttributeName } from "../shared/axisAttributeName";
import { toKebabCase } from "../shared/helpers";

import type { ResolvedOptions } from "./resolveOptions";
import type { ThemeConfig } from "./themeSchema";
import { ALIAS_VALUE_RE } from "./tokenGrammar";

/**
 * Tailwind's built-in `font-<name>` font-weight utility suffixes. A
 * `theme.fontFamily` key that kebab-cases to one of these would produce a
 * `.font-<name>` class colliding with Tailwind's native font-weight
 * utility of the same name (both font-family and font-weight utilities
 * share the `font-` class prefix).
 */
export const TAILWIND_FONT_WEIGHT_UTILITY_NAMES = [
  "thin",
  "extralight",
  "light",
  "normal",
  "medium",
  "semibold",
  "bold",
  "extrabold",
  "black",
] as const;

/**
 * Report one `ZodIssue` per pair of keys in `record` whose `toKebabCase`
 * form collides (e.g. `blue500` and `blue-500` both become `blue-500`) —
 * such a collision would silently overwrite one CSS variable/class with
 * another. Shared by every category record (colors, shadows, backdrop
 * blurs, border radius, font family, border width, typography).
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, unknown> | undefined} record - Category record to check
 * @param {(string | number)[]} pathPrefix - Path segments to prepend to each issue
 * @returns {void}
 */
export const reportKebabCollisions = (
  ctx: z.RefinementCtx,
  record: Record<string, unknown> | undefined,
  pathPrefix: (string | number)[],
): void => {
  if (!record) return;

  const firstKeyByKebab = new Map<string, string>();
  for (const key of Object.keys(record)) {
    const kebab = toKebabCase(key);
    const firstKey = firstKeyByKebab.get(kebab);
    if (firstKey === undefined) {
      firstKeyByKebab.set(kebab, key);
      continue;
    }
    ctx.addIssue({
      code: "custom",
      path: [...pathPrefix, key],
      message:
        `Key "${key}" and "${firstKey}" both kebab-case to "${kebab}" — ` +
        "rename one so the generated CSS variable/class names don't collide.",
    });
  }
};

/**
 * Reject a `theme.borderWidth` key that also names a `theme.colors` key —
 * both emit `border-<kebab-key>`, so the two utilities would share a class
 * (e.g. `borderWidth.primary` alongside `colors.primary`). Keys are
 * compared by kebab-case form, the class they emit: `thinLine` and
 * `thin-line` collide.
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string> | undefined} colors - Base `colors` record
 * @param {Record<string, string> | undefined} borderWidth - Base `borderWidth` record
 * @returns {void}
 */
export const checkBorderWidthColorCollision = (
  ctx: z.RefinementCtx,
  colors: Record<string, string> | undefined,
  borderWidth: Record<string, string> | undefined,
): void => {
  if (!colors || !borderWidth) return;

  const colorClasses = new Set(Object.keys(colors).map(toKebabCase));
  for (const key of Object.keys(borderWidth)) {
    if (!colorClasses.has(toKebabCase(key))) continue;
    ctx.addIssue({
      code: "custom",
      path: ["borderWidth", key],
      message: `borderWidth key "${key}" collides with a colors key emitting the same class "border-${toKebabCase(key)}" — rename one.`,
    });
  }
};

/**
 * Reject a `fontFamily` key whose kebab-case form matches one of
 * Tailwind's built-in font-weight utility suffixes (see
 * {@link TAILWIND_FONT_WEIGHT_UTILITY_NAMES}).
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string> | undefined} fontFamily - Base `fontFamily` record
 * @returns {void}
 */
export const checkFontFamilyWeightNames = (
  ctx: z.RefinementCtx,
  fontFamily: Record<string, string> | undefined,
): void => {
  if (!fontFamily) return;

  const weightNames: readonly string[] = TAILWIND_FONT_WEIGHT_UTILITY_NAMES;
  for (const key of Object.keys(fontFamily)) {
    const kebab = toKebabCase(key);
    if (!weightNames.includes(kebab)) continue;
    ctx.addIssue({
      code: "custom",
      path: ["fontFamily", key],
      message: `fontFamily key "${key}" collides with Tailwind's built-in font-weight utility "font-${kebab}" — rename it.`,
    });
  }
};

/** A CSS-var category key (`colors`, `shadows`, …). */
type ThemeCssCategory = (typeof cssVarCategories)[number]["key"];

/** The one issue shape the `axes` checks report. */
interface AxesIssue {
  code: "custom";
  path: (string | number)[];
  message: string;
}

/**
 * Where the `axes` checks report to: a `z.RefinementCtx` satisfies it, and so
 * does the plain collector {@link assertAxesOptions} uses.
 */
interface AxesIssueCtx {
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
      const target = ALIAS_VALUE_RE.exec(value)?.[1];
      if (target !== undefined) decls.push({ holder, target, where });
    }
  };

  add(theme[category], "base");
  for (const [axis, variants] of Object.entries(theme.themeAxes ?? {})) {
    for (const [variant, override] of Object.entries(variants)) {
      if (override !== skip) add(override[category], `${axis}.${variant}`);
    }
  }
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
  for (const [axis, variants] of Object.entries(theme.themeAxes ?? {})) {
    for (const [variant, override] of Object.entries(variants)) {
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
    }
  }
};

/**
 * Check `axes.attribute` against the theme's axes, whatever the scope: every
 * key must name a `themeAxes` axis, and no two axes may resolve to the same
 * attribute name (their variant blocks would answer to one attribute). Both
 * are reported at `["axes", "attribute", axis]` — for a clash, at the axis
 * that has an explicit entry (else the later one). Attribute names are
 * lowercase by the schema, and so are the `data-<kebab>` defaults, so a plain
 * string comparison is enough.
 * @param {AxesIssueCtx} ctx - Where issues are reported
 * @param {ThemeConfig} theme - Theme already parsed by `ThemeSchema`
 * @param {Readonly<Record<string, string>>} attribute - Resolved `axes.attribute` map
 * @returns {void}
 */
export const checkAxesAttribute = (
  ctx: AxesIssueCtx,
  theme: ThemeConfig,
  attribute: Readonly<Record<string, string>>,
): void => {
  const axes = Object.keys(theme.themeAxes ?? {});

  for (const axis of Object.keys(attribute)) {
    if (axes.includes(axis)) continue;
    ctx.addIssue({
      code: "custom",
      path: ["axes", "attribute", axis],
      message: `axes.attribute names axis "${axis}", which is not declared in theme.themeAxes — fix the name or declare the axis.`,
    });
  }

  const firstAxisByName = new Map<string, string>();
  for (const axis of axes) {
    const name = axisAttributeName(axis, attribute);
    const first = firstAxisByName.get(name);
    if (first === undefined) {
      firstAxisByName.set(name, axis);
      continue;
    }
    ctx.addIssue({
      code: "custom",
      path: [
        "axes",
        "attribute",
        Object.hasOwn(attribute, axis) ? axis : first,
      ],
      message: `Axes "${first}" and "${axis}" would both use the attribute "${name}" — give one of them a different name in axes.attribute.`,
    });
  }
};

/**
 * Run the `axes` checks against the theme and throw every issue as one
 * `ZodError`, like the other `generate()` option and theme failures:
 * {@link checkAxesAttribute} always, {@link checkElementScopeAliases} only
 * for `scope: "element"` (with `"root"` the `html` anchor keeps every alias
 * in step).
 * @param {ThemeConfig} theme - Theme already parsed by `ThemeSchema`
 * @param {ResolvedOptions["axes"]} axes - Resolved `axes` option
 * @returns {void}
 * @throws {z.ZodError} on an unknown or clashing attribute, or a stale alias holder
 */
export const assertAxesOptions = (
  theme: ThemeConfig,
  axes: ResolvedOptions["axes"],
): void => {
  const issues: z.core.$ZodIssue[] = [];
  const ctx: AxesIssueCtx = { addIssue: (issue) => issues.push(issue) };
  checkAxesAttribute(ctx, theme, axes.attribute);
  if (axes.scope === "element") checkElementScopeAliases(ctx, theme);
  if (issues.length > 0) throw new z.ZodError(issues);
};
