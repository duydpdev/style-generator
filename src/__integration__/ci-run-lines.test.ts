import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const script = join(__dirname, "..", "..", "scripts", "ci-run-lines.mjs");

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ci-run-lines-"));
  mkdirSync(join(root, ".github", "workflows"), { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/**
 * @param {string[]} args - Git arguments, run inside the fixture repository
 */
function git(args: string[]) {
  const result = spawnSync(
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- git is resolved from the PATH of the machine running the tests; the arguments are an argv array, never a shell string
    "git",
    [
      "-c",
      "user.email=ci@example.test",
      "-c",
      "user.name=ci",
      "-c",
      "commit.gpgsign=false",
      ...args,
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr);
}

/**
 * @param {string} yaml - Workflow text to write as `ci.yml`
 */
function writeWorkflow(yaml: string) {
  writeFileSync(join(root, ".github", "workflows", "ci.yml"), yaml);
}

/**
 * Commits `before` as `HEAD`, leaves `after` in the working tree.
 * @param {string} before - Workflow text at the revision
 * @param {string} after - Workflow text now
 */
function setup(before: string, after: string) {
  git(["init", "-q"]);
  writeWorkflow(before);
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "base"]);
  writeWorkflow(after);
}

/**
 * @param {string[]} extra - Arguments after `--compare HEAD --root <fixture>`
 * @returns {{ status: number | null, out: string }} Exit status and stdout
 */
function run(extra: string[] = []) {
  const result = spawnSync(
    process.execPath,
    [script, "--compare", "HEAD", "--root", root, ...extra],
    { encoding: "utf8" },
  );
  return { status: result.status, out: result.stdout + result.stderr };
}

/**
 * @param {[string, string?][]} steps - Step names with an optional `if:`
 * @param {string} id - Job id
 * @returns {string} One job block whose steps run `echo <name>`
 */
function job(steps: [string, string?][], id = "check") {
  const body = steps
    .map(([name, cond]) => {
      const condLine = cond ? `        if: ${cond}\n` : "";
      return `      - name: ${name}\n${condLine}        run: echo ${name}\n`;
    })
    .join("");
  return `  ${id}:\n    runs-on: ubuntu-latest\n    steps:\n${body}`;
}

/**
 * @param {string[]} jobs - Job blocks from `job()`
 * @returns {string} A workflow holding those jobs
 */
const workflow = (...jobs: string[]) =>
  `name: t\non: pull_request\njobs:\n${jobs.join("")}`;

describe("ci-run-lines", () => {
  it("reports nothing when the workflow is unchanged", () => {
    const text = workflow(job([["a"], ["b"], ["c"]]));
    setup(text, text);
    const { status, out } = run();
    expect(out.trim()).toBe("missing: 0 if-changed: 0 reordered: 0");
    expect(status).toBe(0);
  });

  it("flags a removed run line as missing and exits 1", () => {
    setup(workflow(job([["a"], ["b"], ["c"]])), workflow(job([["a"], ["c"]])));
    const { status, out } = run();
    expect(out).toContain("ci.yml check: missing: b");
    expect(out).toContain("missing: 1 if-changed: 0 reordered: 0");
    expect(status).toBe(1);
  });

  it("flags a changed `if:` on a kept step", () => {
    setup(
      workflow(job([["a"], ["b"]])),
      workflow(job([["a"], ["b", "github.event_name == 'push'"]])),
    );
    expect(run().out).toContain("missing: 0 if-changed: 1 reordered: 0");
  });

  it("flags both steps of a swap as reordered", () => {
    setup(
      workflow(job([["a"], ["b"], ["c"]])),
      workflow(job([["b"], ["a"], ["c"]])),
    );
    expect(run().out).toContain("missing: 0 if-changed: 0 reordered: 2");
  });

  it("does not count a pure addition or a split across jobs", () => {
    setup(
      workflow(job([["a"], ["b"], ["c"], ["d"]])),
      workflow(
        job([["a"], ["b"]], "build"),
        job([["c"], ["d"], ["e"]], "lint"),
      ),
    );
    expect(run().out.trim()).toBe("missing: 0 if-changed: 0 reordered: 0");
  });

  it("reports a command that left its job but still runs elsewhere", () => {
    setup(
      workflow(
        job([["a"], ["install"]], "build"),
        job([["b"], ["install"]], "lint"),
      ),
      workflow(job([["a"], ["install"]], "build"), job([["b"]], "lint")),
    );
    const { out } = run();
    expect(out).toContain("ci.yml lint: gone-from-job: install");
    expect(out).toContain("missing: 0 if-changed: 0 reordered: 0");
  });

  it("prints the findings as a markdown table", () => {
    setup(workflow(job([["a"], ["b"]])), workflow(job([["a"]])));
    const { out } = run(["--markdown"]);
    expect(out).toContain("| Workflow | Job | Kind | Step |");
    expect(out).toContain("| ci.yml | check | missing | b |");
  });

  it("exits 2 when the revision cannot be read", () => {
    const text = workflow(job([["a"]]));
    setup(text, text);
    const result = spawnSync(
      process.execPath,
      [script, "--compare", "no-such-revision", "--root", root],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("cannot read .github/workflows/");
  });

  it("exits 2 without --compare", () => {
    const result = spawnSync(process.execPath, [script, "--root", root], {
      encoding: "utf8",
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("usage:");
  });
});
