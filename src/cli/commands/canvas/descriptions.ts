import { asRecord } from "./parseHtml";
import type { Reporter } from "./ruleReport";
import type { Standard } from "./standardSchema";
import { declaredRoles, followsGrammar, roleOf } from "./themeRules";

/** Where a description may come from, strongest first when merged. */
export interface DescriptionSources {
  standard: Pick<Standard, "descriptions">;
  /** The product's declared roles; each carries the description of every key built on it. */
  additions?: { roles?: Record<string, { description: string }> | undefined };
  /** `ds.usage.json` `usage`: one sentence per colour key. */
  usage?: Record<string, string> | undefined;
}

/**
 * One description table: the usage file beats a product's role declaration,
 * which beats the packaged default. There is no fourth source, and the design
 * system build reads the same table.
 * @param {DescriptionSources} sources - The three sources
 * @returns {Record<string, string>} Description per colour key or role
 */
export function mergeDescriptions({
  standard,
  additions,
  usage,
}: DescriptionSources): Record<string, string> {
  const merged: Record<string, string> = { ...standard.descriptions };
  for (const [role, { description }] of Object.entries(additions?.roles ?? {}))
    merged[role] = description;
  Object.assign(merged, usage);
  return merged;
}

// The line for one colour key whose description is missing or blank, or null when it has text.
function missingDescription(
  key: string,
  role: string | null,
  merged: Record<string, string>,
): { message: string; name: string } | null {
  const ownText = merged[key];
  const text = ownText ?? (role === null ? undefined : merged[role]);
  if (text !== undefined && text.trim() !== "") return null;
  if (role !== null && ownText === undefined)
    return {
      message: `role ${role} has no description; say when to use it`,
      name: role,
    };
  return { message: `colors.${key} has an empty description`, name: key };
}

/**
 * The description rules: usage entries name theme colours, every colour key has text.
 * @param {Record<string, unknown>} theme - Parsed theme JSON
 * @param {Standard} standard - The standard, layered or packaged
 * @param {Pick<DescriptionSources, "additions" | "usage">} extra - Declared roles, usage file
 * @param {Reporter} reporter - Receives the lines
 * @param {string} path - `<theme>:1`, the location every line names
 */
export function descriptionRules(
  theme: Record<string, unknown>,
  standard: Standard,
  extra: Pick<DescriptionSources, "additions" | "usage">,
  reporter: Reporter,
  path: string,
): void {
  const colors = asRecord(theme.colors);
  const merged = mergeDescriptions({ standard, ...extra });
  for (const key of Object.keys(extra.usage ?? {}))
    if (!(key in colors))
      reporter.error(
        path,
        `usage entry ${key} names no theme colour`,
        "description-unknown-key",
        key,
      );
  const { grammar } = standard;
  if (!grammar) return;
  const vocab = { grammar, declared: declaredRoles(standard) };
  const reportedRoles = new Set<string>();
  for (const key of Object.keys(colors)) {
    // Keys outside the vocabulary are reported by `name-vocabulary`; they have no role to describe.
    if (!followsGrammar(key, vocab)) continue;
    const issue = missingDescription(key, roleOf(key, grammar), merged);
    if (issue === null || reportedRoles.has(issue.name)) continue;
    reportedRoles.add(issue.name);
    reporter.error(path, issue.message, "description-empty", issue.name);
  }
}
