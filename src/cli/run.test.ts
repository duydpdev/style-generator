import { beforeEach, describe, expect, it, vi } from "vitest";

import { budgetCommand } from "./commands/budget";
import { doctorCommand } from "./commands/doctor";
import { generateCommand } from "./commands/generate";
import { initCommand } from "./commands/init";
import { schemaCommand } from "./commands/schema";
import { tokensCommand } from "./commands/tokens";
import { logger } from "./logger";
import { commands, runCli } from "./run";

vi.mock("./commands/budget", () => ({
  BUDGET_USAGE: "style-gen budget <file.css|dir> --max-gzip <bytes>",
  budgetCommand: vi.fn(() => 0),
}));
vi.mock("./commands/doctor", () => ({ doctorCommand: vi.fn(() => 0) }));
vi.mock("./commands/generate", () => ({
  generateCommand: vi.fn(() => Promise.resolve(0)),
}));
vi.mock("./commands/init", () => ({
  initCommand: vi.fn(() => Promise.resolve(0)),
}));
vi.mock("./commands/schema", () => ({ schemaCommand: vi.fn(() => 0) }));
vi.mock("./commands/tokens", () => ({ tokensCommand: vi.fn(() => 0) }));
vi.mock("./version", () => ({ readCliVersion: () => "9.9.9" }));
vi.mock("./logger", () => ({
  logger: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

const CWD = "/project";

const printed = (): string =>
  vi
    .mocked(logger.log)
    .mock.calls.map((c) => c[0])
    .join("\n");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runCli", () => {
  describe("global flags", () => {
    it.each(["--version", "-v"])(
      "prints the version and returns 0 for %s",
      async (flag) => {
        expect(await runCli([flag], CWD)).toBe(0);
        expect(logger.log).toHaveBeenCalledWith("style-gen v9.9.9");
        expect(generateCommand).not.toHaveBeenCalled();
      },
    );

    it.each([[[]], [["--help"]], [["-h"]]])(
      "prints the command list and returns 0 for %j",
      async (args) => {
        expect(await runCli(args, CWD)).toBe(0);
        const out = printed();
        expect(out).toContain("Commands:");
        for (const { name } of commands) expect(out).toContain(name);
      },
    );

    it("returns 1 and names the command when it is unknown", async () => {
      expect(await runCli(["build"], CWD)).toBe(1);
      expect(logger.error).toHaveBeenCalledWith("Unknown command: build");
      expect(printed()).toContain("Commands:");
    });

    it("returns 1 for an unknown flag before any command", async () => {
      expect(await runCli(["--them", "t.json"], CWD)).toBe(1);
      expect(logger.error).toHaveBeenCalledWith("Unknown option: --them");
    });
  });

  describe("per-command --help", () => {
    it.each(commands.map((c) => [c.name]))(
      "`%s --help` prints that command's usage, returns 0 and runs nothing",
      async (name) => {
        expect(await runCli([name, "--help"], CWD)).toBe(0);
        expect(printed()).toContain(`Usage: style-gen ${name}`);
        for (const run of [
          budgetCommand,
          doctorCommand,
          generateCommand,
          initCommand,
          schemaCommand,
          tokensCommand,
        ]) {
          expect(run).not.toHaveBeenCalled();
        }
      },
    );

    it("is also reachable as -h after the command", async () => {
      expect(await runCli(["tokens", "-h"], CWD)).toBe(0);
      expect(printed()).toContain("Usage: style-gen tokens");
    });
  });

  describe("strict per-command flags", () => {
    it("returns 1 with the flag named and the usage printed when a flag is unknown", async () => {
      expect(await runCli(["generate", "--them", "t.json"], CWD)).toBe(1);
      expect(generateCommand).not.toHaveBeenCalled();
      expect(vi.mocked(logger.error).mock.calls[0]?.[0]).toContain("--them");
      expect(printed()).toContain("Usage: style-gen generate");
    });

    it("rejects a flag another command owns (--watch on schema)", async () => {
      expect(await runCli(["schema", "--watch"], CWD)).toBe(1);
      expect(schemaCommand).not.toHaveBeenCalled();
    });

    it("rejects positionals for a command that takes none", async () => {
      expect(await runCli(["doctor", "extra"], CWD)).toBe(1);
      expect(doctorCommand).not.toHaveBeenCalled();
    });

    it("rejects a string flag without a value", async () => {
      expect(await runCli(["generate", "--theme"], CWD)).toBe(1);
      expect(generateCommand).not.toHaveBeenCalled();
    });

    it("budget keeps exit code 2 for flag errors", async () => {
      expect(await runCli(["budget", "a.css", "--max"], CWD)).toBe(2);
      expect(budgetCommand).not.toHaveBeenCalled();
    });
  });

  describe("dispatch", () => {
    it("passes the cwd and returns the command's exit code", async () => {
      vi.mocked(doctorCommand).mockReturnValueOnce(1);
      expect(await runCli(["doctor"], CWD)).toBe(1);
      expect(doctorCommand).toHaveBeenCalledWith(CWD);
    });

    it("maps generate positionals to theme and out", async () => {
      expect(await runCli(["generate", "a.json", "b.css"], CWD)).toBe(0);
      expect(generateCommand).toHaveBeenCalledWith(
        { theme: "a.json", out: "b.css" },
        CWD,
      );
    });

    it("lets each generate flag override its positional, key by key", async () => {
      await runCli(
        ["generate", "a.json", "b.css", "--theme", "t.json", "-w"],
        CWD,
      );
      expect(generateCommand).toHaveBeenCalledWith(
        { theme: "t.json", out: "b.css", watch: true },
        CWD,
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Flags (--theme, --out) take precedence"),
      );
    });

    it("hints at the flags when only positionals are given", async () => {
      await runCli(["generate", "a.json"], CWD);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("prefer: --theme <path> and --out <path>"),
      );
    });

    it("forwards the generate exit code (watch mode resolves once closed)", async () => {
      vi.mocked(generateCommand).mockResolvedValueOnce(1);
      expect(await runCli(["generate"], CWD)).toBe(1);
    });

    it("passes only the init flags that were given", async () => {
      await runCli(["init", "--dark", "--theme", "t.json"], CWD);
      expect(initCommand).toHaveBeenCalledWith(
        { theme: "t.json", dark: true },
        CWD,
      );
    });

    it("passes --out to schema only when given", async () => {
      await runCli(["schema"], CWD);
      await runCli(["schema", "--out", "s.json"], CWD);
      expect(vi.mocked(schemaCommand).mock.calls).toEqual([
        [{}, CWD],
        [{ out: "s.json" }, CWD],
      ]);
    });

    it("passes --theme and --out to tokens only when given", async () => {
      await runCli(["tokens"], CWD);
      await runCli(["tokens", "--theme", "t.json", "--out", "k.ts"], CWD);
      expect(vi.mocked(tokensCommand).mock.calls).toEqual([
        [{}, CWD],
        [{ theme: "t.json", out: "k.ts" }, CWD],
      ]);
    });

    it("passes the budget target and raw --max-gzip", async () => {
      vi.mocked(budgetCommand).mockReturnValueOnce(1);
      expect(
        await runCli(["budget", ".next/static/css", "--max-gzip", "9000"], CWD),
      ).toBe(1);
      expect(budgetCommand).toHaveBeenCalledWith(
        { target: ".next/static/css", maxGzip: "9000" },
        CWD,
      );
    });

    it("budget with a second positional is a usage error, 2", async () => {
      expect(
        await runCli(["budget", "a.css", "b.css", "--max-gzip", "1"], CWD),
      ).toBe(2);
      expect(budgetCommand).not.toHaveBeenCalled();
    });
  });

  describe("failures", () => {
    it("reports a thrown command error and returns 1", async () => {
      vi.mocked(initCommand).mockRejectedValueOnce(new Error("theme exists"));
      expect(await runCli(["init"], CWD)).toBe(1);
      expect(logger.error).toHaveBeenCalledWith("theme exists");
    });

    it("reports a non-Error throw as Unknown error", async () => {
      vi.mocked(doctorCommand).mockImplementationOnce(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "boom";
      });
      expect(await runCli(["doctor"], CWD)).toBe(1);
      expect(logger.error).toHaveBeenCalledWith("Unknown error");
    });
  });
});
