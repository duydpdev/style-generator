import { z } from "zod";

import {
  builtInCategories,
  isCssVarCategory,
} from "../features/registry/builtInCategories";
import type { CategoryKey } from "../features/registry/builtInCategories";

import { mergeScreens } from "./resolveTokenOptions";
import { TOKEN_KEY_RE } from "./tokenGrammar";

/**
 * Grammar for a single `extraSources` entry: non-empty, bounded length, and
 * free of characters that could escape the `@source inline("<entry>")`
 * string literal and inject an arbitrary at-rule (e.g. closing the quote
 * then opening `@import`).
 */
const ExtraSourceEntry = z
  .string()
  .min(1, "extraSources entries must not be empty")
  .max(512, "extraSources entries must be at most 512 characters")
  .refine(
    (v) => !/["'\\;@<>\n\r]/.test(v),
    "extraSources entries must not contain \", ', \\, ;, @, <, >, or a line break",
  );

/**
 * Option names echoed into the CSS (`--breakpoint-<key>`, `md:` variants,
 * `sp-<key>`, `--sg-sp-<key>-<bp>`) use the theme key grammar, without the
 * typed-token round-trip check (options never become typed tokens).
 */
const OptionKey = z
  .string()
  .regex(
    TOKEN_KEY_RE,
    "Key must start with a letter/digit and contain only letters, digits, `-`",
  );

/** A CSS property name (`padding`, `column-gap`, `--custom`). */
const CssPropertyName = z
  .string()
  .regex(
    /^-{0,2}[a-z][a-z0-9-]*$/,
    "CSS property name must be lowercase letters, digits and `-`",
  );

/**
 * One screen width: a single non-negative length in px, rem or em. The
 * value becomes `--breakpoint-<key>`, which Tailwind sorts to order the
 * responsive variants — anything else (`banana`, `10vw`, `calc(…)`) breaks
 * that ordering or the media query.
 */
const SCREEN_LENGTH_RE = /^\d+(\.\d+)?(px|rem|em)$/;

const ScreenValue = z
  .string()
  .regex(
    SCREEN_LENGTH_RE,
    "Screen width must be a single length in px, rem or em (e.g. 768px, 48rem)",
  );

/**
 * The category keys `coverage` accepts: exactly the registry's
 * `CategoryKey` union, derived from the descriptors so a new category cannot
 * be forgotten here.
 */
const CoverageCategoryKey = z.enum(
  // `map` loses the tuple type z.enum needs; the registry is never empty.
  builtInCategories.map((descriptor) => descriptor.key) as [
    CategoryKey,
    ...CategoryKey[],
  ],
);

/**
 * Per-category `@source inline` coverage. A bare boolean switches the
 * category on/off; the object form narrows it to some class prefixes
 * and/or to the alias holders. Every `prefixes` entry must be a real class
 * prefix of that category (`bg`, `rounded-t`, …): a typo would otherwise
 * silently drop the category's coverage.
 */
const CoverageSchema = z
  .partialRecord(
    CoverageCategoryKey,
    z.union(
      [
        z.boolean(),
        z.strictObject({
          prefixes: z.array(z.string()).min(1).optional(),
          keys: z.enum(["aliased", "all"]).optional(),
        }),
      ],
      {
        error:
          'Expected a boolean or { prefixes?: string[] (non-empty), keys?: "aliased" | "all" }',
      },
    ),
  )
  .superRefine((coverage, ctx) => {
    for (const descriptor of builtInCategories) {
      const rule = coverage[descriptor.key];
      if (typeof rule !== "object") continue;

      if (!isCssVarCategory(descriptor) && rule.keys === "aliased") {
        ctx.addIssue({
          code: "custom",
          path: [descriptor.key, "keys"],
          message: `"${descriptor.key}" has no \`$\` aliases, so \`keys: "aliased"\` would drop all its coverage; use \`false\` to drop it deliberately`,
        });
      }
      if (!rule.prefixes) continue;

      const valid: readonly string[] = descriptor.classPrefixes;
      rule.prefixes.forEach((prefix, index) => {
        if (!("bareClassName" in descriptor) && valid.includes(prefix)) return;
        ctx.addIssue({
          code: "custom",
          path: [descriptor.key, "prefixes", index],
          message:
            "bareClassName" in descriptor
              ? `"${descriptor.key}" has no class prefixes (its keys are the class names); drop \`prefixes\` or use \`keys\``
              : `Unknown class prefix "${prefix}" for "${descriptor.key}"; expected one of: ${valid.join(", ")}`,
        });
      });
    }
  });

/**
 * Strict shape of `StyleGeneratorOptions`, without the cross-field
 * refinement: unknown keys (also inside `spacing`/`typography`) are
 * rejected, behavioural flags must be booleans, and every option that
 * reaches `generate().css` follows the theme's injection-safe grammar.
 * `src/cli/config.ts` extends it for `style-gen.config.json`.
 */
export const StyleGeneratorOptionsShape = z.strictObject({
  breakpoints: z.array(OptionKey).optional(),
  screens: z.record(OptionKey, ScreenValue).optional(),
  enableResponsive: z.boolean().optional(),
  typography: z
    .strictObject({ cssVarDriven: z.boolean().optional() })
    .optional(),
  spacing: z
    .strictObject({
      enabled: z.boolean().optional(),
      properties: z
        .record(OptionKey, z.array(CssPropertyName).min(1))
        .optional(),
    })
    .optional(),
  extraSources: z.array(ExtraSourceEntry).optional(),
  coverage: CoverageSchema.optional(),
});

/**
 * Cross-field checks on `screens` merged with the px `defaultScreens`:
 * (1) every merged screen uses the same unit — Tailwind sorts breakpoints by
 * value, so mixing `rem` with the px defaults orders the variants wrongly;
 * (2) every `breakpoints` entry names a merged screen. The fields are typed
 * `unknown` and guarded, because the refinement can run while they already
 * carry their own issues.
 * @param {object} options - Options being validated
 * @param {unknown} [options.breakpoints] - Breakpoint keys
 * @param {unknown} [options.screens] - Custom screens map
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @returns {void}
 */
export const refineStyleGeneratorOptions = (
  options: { breakpoints?: unknown; screens?: unknown },
  ctx: z.RefinementCtx,
): void => {
  const screens: Record<string, unknown> =
    typeof options.screens === "object" && options.screens !== null
      ? Object.fromEntries(Object.entries(options.screens))
      : {};
  const merged: Record<string, unknown> = mergeScreens(screens);

  const keysByUnit = new Map<string, string[]>();
  for (const [key, value] of Object.entries(merged)) {
    if (typeof value !== "string") continue;
    const unit = SCREEN_LENGTH_RE.exec(value)?.[2];
    if (!unit) continue;
    keysByUnit.set(unit, [...(keysByUnit.get(unit) ?? []), key]);
  }
  if (keysByUnit.size > 1) {
    const list = [...keysByUnit]
      .map(([unit, keys]) => `${unit}: ${keys.join(", ")}`)
      .join("; ");
    ctx.addIssue({
      code: "custom",
      path: ["screens"],
      message: `screens must all use one unit after merging with the defaults (${list}); mixed units sort breakpoints incorrectly — use px, or override every default screen in the same unit`,
    });
  }

  const breakpoints: unknown[] = Array.isArray(options.breakpoints)
    ? options.breakpoints
    : [];
  breakpoints.forEach((bp, i) => {
    if (typeof bp === "string" && !Object.hasOwn(merged, bp)) {
      ctx.addIssue({
        code: "custom",
        path: ["breakpoints", i],
        message: `Breakpoint "${bp}" has no screen width; add it to options.screens or use one of: ${Object.keys(merged).join(", ")}`,
      });
    }
  });
};

/**
 * Validates every `generate()` option. Internal: not exported from any
 * barrel; `src/cli/config.ts` reuses {@link StyleGeneratorOptionsShape} and
 * {@link refineStyleGeneratorOptions} so `style-gen.config.json` gets the
 * same verdict.
 */
export const StyleGeneratorOptionsSchema =
  StyleGeneratorOptionsShape.superRefine(refineStyleGeneratorOptions);
