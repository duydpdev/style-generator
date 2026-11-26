import { z } from "zod";

import {
  builtInCategories,
  isCssVarCategory,
} from "../features/registry/builtInCategories";
import type {
  BuiltInCategory,
  CategoryKey,
} from "../features/registry/builtInCategories";

import { mergeScreens } from "./resolveTokenOptions";
import { TOKEN_KEY_RE } from "./tokenGrammar";

// Option names reach the CSS: theme key grammar, minus the typed-token round trip.
const OptionKey = z
  .string()
  .regex(
    TOKEN_KEY_RE,
    "Key must start with a letter/digit and contain only letters, digits, `-`",
  );

const CssPropertyName = z
  .string()
  .regex(
    /^-{0,2}[a-z][a-z0-9-]*$/,
    "CSS property name must be lowercase letters, digits and `-`",
  );

// Tailwind sorts `--breakpoint-<key>` values, so only one plain length sorts right.
const SCREEN_LENGTH_RE = /^\d+(\.\d+)?(px|rem|em)$/;

const ScreenValue = z
  .string()
  .regex(
    SCREEN_LENGTH_RE,
    "Screen width must be a single length in px, rem or em (e.g. 768px, 48rem)",
  );

const CoverageCategoryKey = z.enum(
  // `map` loses the tuple type z.enum needs; the registry is never empty.
  builtInCategories.map((descriptor) => descriptor.key) as [
    CategoryKey,
    ...CategoryKey[],
  ],
);

const OpacityStep = z.number().int().min(1).max(100);

// Group prefixes are checked in `CoverageSchema`, keys in `assertThemeOptions`.
const OpacityGroup = z.strictObject({
  steps: z
    .array(OpacityStep)
    .min(1)
    .refine(
      (steps) => new Set(steps).size === steps.length,
      "Opacity steps must be unique",
    ),
  prefixes: z.array(z.string()).min(1).optional(),
  keys: z.array(z.string()).min(1).optional(),
});

// Reject `keys: "aliased"` on an alias-free category and `prefixes` on a
// literal scale; returns `true` when `prefixes` was reported.
const checkAliasFreeRule = (
  descriptor: BuiltInCategory,
  rule: {
    readonly keys?: string | undefined;
    readonly prefixes?: readonly string[] | undefined;
  },
  ctx: z.RefinementCtx,
): boolean => {
  const literalScale = "literalScale" in descriptor;
  if (
    (literalScale || !isCssVarCategory(descriptor)) &&
    rule.keys === "aliased"
  ) {
    ctx.addIssue({
      code: "custom",
      path: [descriptor.key, "keys"],
      message: `"${descriptor.key}" has no \`$\` aliases, so \`keys: "aliased"\` would drop all its coverage; use \`false\` to drop it deliberately`,
    });
  }
  if (!literalScale || !rule.prefixes) return false;
  ctx.addIssue({
    code: "custom",
    path: [descriptor.key, "prefixes"],
    message: `"${descriptor.key}" has one class prefix (${descriptor.classPrefixes.join(", ")}), so \`prefixes\` can only keep or drop all of it; use \`true\` or \`false\``,
  });
  return true;
};

// Every `prefixes` entry must be a real prefix of its category: a typo would
// otherwise silently drop that category's coverage.
const CoverageSchema = z
  .partialRecord(
    CoverageCategoryKey,
    z.union(
      [
        z.boolean(),
        z.strictObject({
          prefixes: z.array(z.string()).min(1).optional(),
          keys: z.enum(["aliased", "all"]).optional(),
          opacities: z
            .array(
              z.union([OpacityStep, OpacityGroup], {
                error:
                  "Expected opacities?: (integer 1–100 | { steps, prefixes?, keys? })[]",
              }),
            )
            .min(1)
            .refine((entries) => {
              const steps = entries.filter(
                (entry) => typeof entry === "number",
              );
              return new Set(steps).size === steps.length;
            }, "Opacity steps must be unique")
            .optional(),
        }),
      ],
      {
        error:
          'Expected a boolean or { prefixes?: string[] (non-empty), keys?: "aliased" | "all", opacities?: (integer 1–100 | { steps, prefixes?, keys? })[] (non-empty, colors only) }',
      },
    ),
  )
  .superRefine((coverage, ctx) => {
    for (const descriptor of builtInCategories) {
      const rule = coverage[descriptor.key];
      if (typeof rule !== "object") continue;

      const prefixesReported = checkAliasFreeRule(descriptor, rule, ctx);
      if (rule.opacities && !("opacityModifier" in descriptor)) {
        ctx.addIssue({
          code: "custom",
          path: [descriptor.key, "opacities"],
          message: `"${descriptor.key}" utilities take no \`/<n>\` opacity modifier (only color utilities do)`,
        });
      }
      const valid: readonly string[] = descriptor.classPrefixes;
      const checkPrefixes = (
        prefixes: readonly string[],
        path: (string | number)[],
      ): void => {
        prefixes.forEach((prefix, index) => {
          if (!("bareClassName" in descriptor) && valid.includes(prefix)) {
            return;
          }
          ctx.addIssue({
            code: "custom",
            path: [...path, index],
            message:
              "bareClassName" in descriptor
                ? `"${descriptor.key}" has no class prefixes (its keys are the class names); drop \`prefixes\` or use \`keys\``
                : `Unknown class prefix "${prefix}" for "${descriptor.key}"; expected one of: ${valid.join(", ")}`,
          });
        });
      };

      if ("opacityModifier" in descriptor) {
        rule.opacities?.forEach((entry, index) => {
          if (typeof entry === "number" || !entry.prefixes) return;
          checkPrefixes(entry.prefixes, [
            descriptor.key,
            "opacities",
            index,
            "prefixes",
          ]);
        });
      }
      if (rule.prefixes && !prefixesReported) {
        checkPrefixes(rule.prefixes, [descriptor.key, "prefixes"]);
      }
    }
  });

/**
 * Strict shape of `StyleGeneratorOptions` without the cross-field refinement;
 * `src/node/loadStyleGenConfig.ts` extends it for `style-gen.config.json`.
 * Rationale: documents/architecture.md#stylegeneratoroptions-why-each-option-is-declared-in-four-files
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
  coverage: CoverageSchema.optional(),
  resetTailwindDefaults: z
    .array(z.enum(["colors", "radius", "shadow"]))
    .optional(),
});

/**
 * Merged screens must share one unit (Tailwind sorts them by value) and every
 * breakpoint must name one. Fields are `unknown`: they may carry own issues.
 * @param {object} options - Options being validated
 * @param {unknown} [options.breakpoints] - Breakpoint keys
 * @param {unknown} [options.screens] - Custom screens map
 * @param {z.RefinementCtx} ctx - Zod refinement context
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

/** Validates every `generate()` option; internal, not exported from any barrel. */
export const StyleGeneratorOptionsSchema =
  StyleGeneratorOptionsShape.superRefine(refineStyleGeneratorOptions);
