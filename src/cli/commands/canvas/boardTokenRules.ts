/**
 * The board rules that read class names against the theme: `ref-class` and
 * `token-bypass`. This module is its own build entry (`dist/cli/canvas-classes.mjs`)
 * that `check.ts` loads with `import()` only for `--boards`, so a run without
 * it never loads Tailwind or the generator.
 */
import { loadGeneratorOptions, ruleCss, themeFamilies } from "./boardInputs";
import { presetCandidates, type ClassUse } from "./classCandidates";
import { createRuleCompiler } from "./compileCss";
import type { Reporter } from "./ruleReport";
import type { LayeredStandard } from "./standardLayer";
import { unusedTokens } from "./tokenUnused";
import {
  bypassedFamily,
  bypassExcepted,
  firstUses,
  namedFamilies,
} from "./tokenClasses";

/** What the class rules read. */
export interface BoardTokenInput {
  /** Every class use of the boards and the preset. */
  uses: readonly ClassUse[];
  /** Parsed theme JSON. */
  theme: Record<string, unknown>;
  /** The product's `style-gen.config.json`; the default options without it. */
  configFile: { path: string; label: string } | undefined;
  standard: LayeredStandard;
  /** The product's project root, where `tailwindcss` is resolved from. */
  cwd: string;
  /** `--sg-…` variables the boards and stylesheets read. */
  vars: ReadonlySet<string>;
  /** The preset's source and the path it was given as. */
  preset: { source: string } | undefined;
  /** The theme path as written, for the `token-unused` lines. */
  themePath: string;
}

/**
 * Reports `ref-class`, `token-bypass` and `token-unused` into `reporter`; rejects with a `CanvasInputError` when `tailwindcss` cannot be loaded or the theme does not compile.
 * @param {BoardTokenInput} input - Uses, theme and options
 * @param {Reporter} reporter - Receives the errors
 * @returns {Promise<void>} Resolves once both rules ran
 */
export async function boardTokenRules(
  input: BoardTokenInput,
  reporter: Reporter,
): Promise<void> {
  const options =
    input.configFile === undefined
      ? {}
      : loadGeneratorOptions(input.configFile.path, input.configFile.label);
  unusedTokens(
    input.theme,
    {
      uses: input.uses,
      vars: input.vars,
      presetWords: presetCandidates(input.preset?.source ?? ""),
      presetSource: input.preset?.source,
    },
    input.standard.reserved,
    reporter,
    `${input.themePath}:1`,
  );
  const families = themeFamilies(input.theme);
  if (families.length === 0) return;
  const uses = firstUses(input.uses);
  const where = (use: ClassUse) => `${use.file}:${String(use.line)}`;
  const named = uses.filter(
    (use) => namedFamilies(use.candidate, families).length > 0,
  );
  if (named.length > 0) {
    const compiler = await createRuleCompiler({
      css: ruleCss(input.theme, options),
      cwd: input.cwd,
    });
    const produced = compiler.producing(named.map((use) => use.candidate));
    for (const use of named) {
      if (produced.has(use.candidate)) continue;
      const keys = namedFamilies(use.candidate, families).map((f) => f.key);
      reporter.error(
        where(use),
        `unknown class ${use.candidate} (no ${keys.join(" or ")} token or utility produces it)`,
        "ref-class",
        use.candidate,
      );
    }
  }
  const excepted = input.standard.exceptions?.bypass ?? [];
  for (const use of uses) {
    const family = bypassedFamily(use.candidate, families);
    if (family === undefined || bypassExcepted(excepted, use)) continue;
    reporter.error(
      where(use),
      `class ${use.candidate} writes a raw ${family.key} value (use a ${family.key} token)`,
      "token-bypass",
      use.candidate,
    );
  }
}
