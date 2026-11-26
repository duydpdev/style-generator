#!/usr/bin/env node
/**
 * Run-line guard for the GitHub workflows. Compares every `run:` step of
 * `.github/workflows/*.yml` at a git revision with the working tree and
 * reports the steps a CI refactor must not lose silently:
 *   missing      no step with that command exists in the file any more
 *   if-changed   the step's `if:` differs from the old one
 *   reordered    the steps kept in the same job no longer precede it in the
 *                same set (swapping two steps flags both)
 *   gone-from-job (info) the command left its job but survives in another;
 *                the old job still runs other steps (a job that stops
 *                building, for instance)
 * A job whose steps all moved elsewhere counts as split, not gone.
 *
 * A step's condition is the job's `if:` and `continue-on-error` plus the step's own,
 * so a job that stops running (or stops failing the run) shows up as if-changed.
 *
 * Usage: node scripts/ci-run-lines.mjs --compare <rev> [--markdown] [--root dir]
 * Exit code: 1 when a step is missing, 2 on a usage error or an unreadable revision.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

/** @typedef {{ job: string, run: string, cond: string, name: string }} Step */

const args = process.argv.slice(2);
/**
 * @param {string} name - Option name, e.g. `--compare`
 * @returns {string | undefined} The value after the option
 */
const option = (name) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};

/**
 * @param {string} text - Workflow YAML
 * @returns {Step[]} Every step with a `run:` command, in file order
 */
function runSteps(text) {
  /** @type {Step[]} */
  const steps = [];
  /** @type {{ jobs?: Record<string, { if?: unknown, "continue-on-error"?: unknown, steps?: Record<string, unknown>[] }> }} */
  const doc = parse(text) ?? {};
  for (const [job, def] of Object.entries(doc.jobs ?? {})) {
    for (const step of def.steps ?? []) {
      if (typeof step.run !== "string") continue;
      const run = step.run.trim();
      steps.push({
        job,
        run,
        cond: [
          def.if,
          def["continue-on-error"],
          step.if,
          step["continue-on-error"],
        ]
          .map((part) => String(part ?? "").trim())
          .join(" | "),
        name: String(step.name ?? run.split("\n")[0]),
      });
    }
  }
  return steps;
}

/**
 * Pairs each old step with a new one: first a not yet used step of the same
 * job with the same command, else any step of the file with it.
 * @param {Step[]} before - Steps at the revision
 * @param {Step[]} after - Steps now
 * @returns {{ old: Step, next: Step | undefined, moved: boolean }[]} One pair per old step
 */
function pair(before, after) {
  const used = new Set();
  return before.map((old) => {
    const same = after.find(
      (s) => s.job === old.job && s.run === old.run && !used.has(s),
    );
    if (same) used.add(same);
    const next = same ?? after.find((s) => s.run === old.run);
    return { old, next, moved: next !== undefined && same === undefined };
  });
}

/**
 * @param {Step[]} before - Steps at the revision
 * @param {Step[]} after - Steps now
 * @returns {{ missing: Step[], ifChanged: Step[], reordered: Step[], gone: Step[] }} Findings of one workflow file
 */
function compare(before, after) {
  const pairs = pair(before, after);
  const stays = new Set(
    pairs.filter((p) => p.next && !p.moved).map((p) => p.old.job),
  );
  const missing = pairs.filter((p) => !p.next).map((p) => p.old);
  const ifChanged = pairs
    .filter((p) => p.next && p.next.cond !== p.old.cond)
    .map((p) => p.old);
  const gone = pairs
    .filter((p) => p.moved && stays.has(p.old.job))
    .map((p) => p.old);
  const kept = pairs.filter(
    (p) => p.next && !(p.moved && stays.has(p.old.job)),
  );
  const reordered = kept
    .filter((p) => {
      const group = kept.filter((q) => q.next?.job === p.next?.job);
      const preceding = (/** @type {(q: typeof p) => number} */ position) =>
        group
          .filter((q) => position(q) < position(p))
          .map((q) => q.old.name)
          .sort()
          .join("\n");
      return (
        preceding((q) => before.indexOf(q.old)) !==
        preceding((q) => after.indexOf(/** @type {Step} */ (q.next)))
      );
    })
    .map((p) => p.old);
  return { missing, ifChanged, reordered, gone };
}

const root = resolve(
  option("--root") ?? join(dirname(fileURLToPath(import.meta.url)), ".."),
);
const rev = option("--compare");
if (!rev) {
  console.error(
    "usage: node scripts/ci-run-lines.mjs --compare <rev> [--markdown] [--root dir]",
  );
  process.exit(2);
}

const dir = ".github/workflows";
/**
 * @param {string[]} gitArgs - Arguments of the `git` call
 * @param {"ignore" | "inherit"} stderr - What happens to git's stderr
 * @returns {string} Standard output of git
 */
const git = (gitArgs, stderr) =>
  execFileSync(
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- git is resolved from the developer's or runner's PATH; the arguments are an argv array, never a shell string
    "git",
    gitArgs,
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", stderr] },
  );
/**
 * @param {string} file - Workflow file name
 * @returns {string} Its text at the revision, empty when it did not exist
 */
const atRevision = (file) => {
  try {
    return git(["show", `${rev}:${dir}/${file}`], "ignore");
  } catch {
    return "";
  }
};
/**
 * @param {string} file - Workflow file name
 * @returns {string} Its text in the working tree, empty when it is gone
 */
const inTree = (file) => {
  try {
    return readFileSync(join(root, dir, file), "utf8");
  } catch {
    return "";
  }
};
const isWorkflow = (/** @type {string} */ name) => /\.ya?ml$/.test(name);
/** @type {string} */
let tree;
try {
  tree = git(["ls-tree", "--name-only", rev, `${dir}/`], "inherit");
} catch {
  console.error(`ci-run-lines: cannot read ${dir}/ at "${rev}"`);
  process.exit(2);
}
const listed = tree
  .split("\n")
  .map((path) => path.slice(dir.length + 1))
  .filter(isWorkflow);
const names = [
  ...new Set([...listed, ...readdirSync(join(root, dir)).filter(isWorkflow)]),
].sort();

/** @type {{ file: string, kind: string, step: Step }[]} */
const rows = [];
const totals = { missing: 0, ifChanged: 0, reordered: 0 };
for (const file of names) {
  const found = compare(runSteps(atRevision(file)), runSteps(inTree(file)));
  totals.missing += found.missing.length;
  totals.ifChanged += found.ifChanged.length;
  totals.reordered += found.reordered.length;
  for (const [kind, steps] of /** @type {const} */ ([
    ["missing", found.missing],
    ["if-changed", found.ifChanged],
    ["reordered", found.reordered],
    ["gone-from-job", found.gone],
  ]))
    for (const step of steps) rows.push({ file, kind, step });
}

const summary = `missing: ${totals.missing} if-changed: ${totals.ifChanged} reordered: ${totals.reordered}`;
if (args.includes("--markdown")) {
  if (rows.length > 0) {
    console.log("| Workflow | Job | Kind | Step |\n| --- | --- | --- | --- |");
    for (const { file, kind, step } of rows)
      console.log(
        `| ${file} | ${step.job} | ${kind} | ${step.name.replaceAll("|", "\\|")} |`,
      );
    console.log("");
  }
} else
  for (const { file, kind, step } of rows)
    console.log(`${file} ${step.job}: ${kind}: ${step.name}`);
console.log(summary);
process.exit(totals.missing > 0 ? 1 : 0);
