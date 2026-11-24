import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "../logger";

import { doctorCommand } from "./doctor";
import { generateCommand } from "./generate";
import { initCommand } from "./init";

// Every hint that names a command runs it with the package manager of the
// project in `cwd`. Each test runs with the user agent unset and a pnpm
// lockfile in a temporary repository root, so a call site that read
// `process.cwd()` (this repository, which holds yarn.lock) or the runner's
// user agent would print another command.
const PNPM = "pnpm exec style-gen";
const CONFIG = "style-gen.config.json";
const THEME = "styles/theme.json";

let tmp: string;
let rulesDir: string;
let rulesSrc: string;
let origTty: boolean | undefined;
let output: string[];

/**
 * Write a file under the temporary project root.
 * @param {string} file - Path relative to the root
 * @param {unknown} content - A string, or a value written as JSON
 */
function write(file: string, content: unknown): void {
  const target = path.join(tmp, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(
    target,
    typeof content === "string" ? content : JSON.stringify(content),
  );
}

/**
 * Everything the command printed, through any logger method.
 * @returns {string} The lines, joined
 */
const printed = (): string => output.join("\n");

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-hints-"));
  fs.mkdirSync(path.join(tmp, ".git"));
  write("package.json", { name: "hints" });
  write("pnpm-lock.yaml", "lockfileVersion: '9.0'\n");
  rulesDir = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-hints-rules-"));
  rulesSrc = path.join(rulesDir, "style-generator.md");
  fs.writeFileSync(rulesSrc, "# rules\n");
  vi.stubEnv("npm_config_user_agent", undefined);
  origTty = process.stdin.isTTY;
  Object.defineProperty(process.stdin, "isTTY", {
    value: false,
    configurable: true,
  });
  output = [];
  for (const method of ["log", "info", "warn", "error", "success"] as const)
    vi.spyOn(logger, method).mockImplementation((message: unknown) => {
      output.push(String(message));
    });
});

afterEach(() => {
  Object.defineProperty(process.stdin, "isTTY", {
    value: origTty,
    configurable: true,
  });
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(rulesDir, { recursive: true, force: true });
});

describe("CLI hints follow the package manager of the project root", () => {
  it("doctor: start fresh after a failed check", () => {
    write(CONFIG, { theme: THEME });
    write(THEME, "{");

    expect(doctorCommand(tmp)).toBe(1);

    expect(printed()).toContain(
      `💡 Fix errors above or start fresh by running: ${PNPM} init`,
    );
  });

  it("doctor: generate when the output does not exist yet", () => {
    write(CONFIG, { theme: THEME });
    write(THEME, { colors: { primary: "#3B82F6" } });

    expect(doctorCommand(tmp)).toBe(0);

    expect(printed()).toContain(
      `💡 Setup looks complete! Generate your CSS by running: ${PNPM} generate`,
    );
  });

  it("init --yes: an invalid config", async () => {
    write(CONFIG, { theme: THEME, extraSources: ["bg-x"] });

    expect(await initCommand({ yes: true }, tmp, rulesSrc)).toBe(1);

    expect(printed()).toContain(`💡 Fix it first: ${PNPM} doctor`);
  });

  it("init: a config whose theme cannot be read", async () => {
    write(CONFIG, { theme: 5 });

    expect(await initCommand({}, tmp, rulesSrc)).toBe(1);

    expect(printed()).toContain(
      `💡 Fix it first: ${PNPM} doctor, or pass --theme <path>`,
    );
  });

  it("init: the warning for an invalid config it keeps", async () => {
    write(CONFIG, { theme: THEME, extraSources: ["bg-x"] });

    expect(await initCommand({ theme: THEME }, tmp, rulesSrc)).toBe(0);

    expect(printed()).toContain("is invalid and init left it as it is");
    expect(printed()).toContain(`💡 Fix it: ${PNPM} doctor`);
  });

  it("init: the generate step without a bundler config", async () => {
    expect(await initCommand({ yes: true }, tmp, rulesSrc)).toBe(0);

    expect(printed()).toContain(`\`${PNPM} generate\``);
  });

  it("init --rules-only: no config to print CSS lines for", async () => {
    expect(await initCommand({ rulesOnly: true }, tmp, rulesSrc)).toBe(0);

    expect(printed()).toContain(`Run \`${PNPM} init\` to scaffold the theme`);
  });

  it("init --rules-only: an edited rules file without a terminal", async () => {
    write(".claude/rules/style-generator.md", "# edited\n");

    expect(await initCommand({ rulesOnly: true }, tmp, rulesSrc)).toBe(0);

    expect(printed()).toContain(
      `Run \`${PNPM} init --rules-only\` in an interactive terminal`,
    );
  });

  describe("generate --check", () => {
    beforeEach(async () => {
      write(CONFIG, { theme: THEME });
      write(THEME, { colors: { primary: "#3B82F6" } });
      expect(await generateCommand({}, tmp)).toBe(0);
      output = [];
    });

    it("a tokens file that is out of date", async () => {
      write(THEME, { colors: { primary: "#3B82F6", accent: "#F59E0B" } });

      expect(await generateCommand({ check: true }, tmp)).toBe(1);

      expect(printed()).toMatch(
        new RegExp(
          String.raw`theme\.tokens\.ts is out of date\. Run: ${PNPM} generate$`,
        ),
      );
    });

    it("a tokens file that does not exist", async () => {
      fs.rmSync(path.join(tmp, "styles", "theme.tokens.ts"));

      expect(await generateCommand({ check: true }, tmp)).toBe(1);

      expect(printed()).toMatch(
        new RegExp(
          String.raw`theme\.tokens\.ts does not exist\. Run: ${PNPM} generate$`,
        ),
      );
    });

    it("a tokens file that cannot be read gets no generate hint", async () => {
      const tokens = path.join(tmp, "styles", "theme.tokens.ts");
      fs.rmSync(tokens);
      fs.mkdirSync(tokens);

      expect(await generateCommand({ check: true }, tmp)).toBe(1);

      expect(printed()).toContain("Cannot read");
      expect(printed()).not.toContain("Run:");
    });
  });
});
