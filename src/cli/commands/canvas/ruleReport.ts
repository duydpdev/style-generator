import type { LayeredStandard } from "./standardLayer";

/** The result of a check: `errors` fail the run, `findings` are reported and exit 0. */
export interface Report {
  errors: string[];
  findings: string[];
}

/**
 * Rule ids this release evaluates. An exemption of any other id is not reported
 * as stale: its rule has not run, so it could not have matched.
 */
export const EVALUATED_RULES: readonly string[] = [
  "name-vocabulary",
  "description-empty",
  "description-unknown-key",
  "scale-name",
  "scale-order",
  "scale-unit",
  "scale-duplicate",
  "order-text",
  "order-border",
  "order-surface",
  "contrast-text",
  "contrast-focus",
  "ds-name-collision",
];

/** Collects the lines of a run; a disabled rule or an exempted name adds nothing. */
export interface Reporter {
  /** An error line `<path> <message> [<rule>; <basis>]` (no suffix without a rule). */
  error(path: string, message: string, rule?: string, name?: string): void;
  /** A finding line `finding: <path> <message> [<rule>]`. */
  finding(path: string, message: string, rule: string, name?: string): void;
  /** A violation line some other check already formatted. */
  raw(line: string): void;
  /** Findings for every exemption of an evaluated rule that silenced nothing. */
  staleExemptions(path: string): void;
  report(): Report;
}

/**
 * The basis of a rule as printed after its id: `<type>: <source>`.
 * @param {LayeredStandard} standard - The standard the run applies
 * @param {string} rule - Rule id
 * @returns {string} The text, or the bare type when the rule states no source
 */
function basisText(standard: LayeredStandard, rule: string): string {
  const basis = standard.rules?.[rule]?.basis;
  if (basis === undefined) return "";
  return basis.source === undefined
    ? basis.type
    : `${basis.type}: ${basis.source}`;
}

/**
 * A reporter bound to one standard and the rules switched off for this run.
 * @param {LayeredStandard} standard - The standard the run applies
 * @param {ReadonlySet<string>} disabled - Rule ids given to `--no-rule`
 * @returns {Reporter} Empty until a check reports into it
 */
export function createReporter(
  standard: LayeredStandard,
  disabled: ReadonlySet<string>,
): Reporter {
  const report: Report = { errors: [], findings: [] };
  const used = new Set<number>();
  const exemptions = standard.exemptions ?? [];
  const silenced = (rule: string | undefined, name: string | undefined) => {
    if (rule === undefined) return false;
    if (disabled.has(rule)) return true;
    const index = exemptions.findIndex(
      (entry) => entry.rule === rule && entry.name === name,
    );
    if (index >= 0) used.add(index);
    return index >= 0;
  };
  return {
    error(path, message, rule, name) {
      if (silenced(rule, name)) return;
      if (rule === undefined) {
        report.errors.push(`${path} ${message}`);
        return;
      }
      const basis = basisText(standard, rule);
      const tag = basis === "" ? rule : rule + "; " + basis;
      report.errors.push(`${path} ${message} [${tag}]`);
    },
    finding(path, message, rule, name) {
      if (silenced(rule, name)) return;
      report.findings.push(`finding: ${path} ${message} [${rule}]`);
    },
    staleExemptions(path) {
      exemptions.forEach((entry, index) => {
        if (
          used.has(index) ||
          disabled.has(entry.rule) ||
          !EVALUATED_RULES.includes(entry.rule)
        )
          return;
        report.findings.push(
          `finding: ${path} exemption ${entry.rule} ${entry.name} matches nothing; remove it [exemption-unused]`,
        );
      });
    },
    raw(line) {
      report.errors.push(line);
    },
    report: () => report,
  };
}
