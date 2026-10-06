import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateCommand } from "./commands/generate";
import { initCommand } from "./commands/init";
import { schemaCommand } from "./commands/schema";
import { logger } from "./logger";

vi.mock("./commands/doctor", () => ({ doctorCommand: vi.fn() }));
vi.mock("./commands/generate", () => ({ generateCommand: vi.fn() }));
vi.mock("./commands/init", () => ({ initCommand: vi.fn() }));
vi.mock("./commands/schema", () => ({ schemaCommand: vi.fn() }));
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

/** Thrown by the mocked `process.exit` so the entry stops where the real one would. */
class ExitSignal extends Error {
  constructor(readonly code: number | undefined) {
    super(`exit ${String(code)}`);
  }
}

let exitCodes: (number | undefined)[] = [];

/**
 * Import the CLI entry (it runs `main()` on load) with the given arguments.
 * @param {string[]} argv - Arguments after `style-gen`
 * @returns {Promise<number | undefined>} The first exit code, or `undefined` if the entry did not exit
 */
const runCli = async (argv: string[]): Promise<number | undefined> => {
  process.argv = ["node", "style-gen", ...argv];
  vi.resetModules();
  try {
    // The entry runs `main()` at module load, so each case re-imports it.
    await import("./index");
  } catch (error) {
    if (!(error instanceof ExitSignal)) throw error;
  }
  return exitCodes[0];
};

const originalArgv = process.argv;

beforeEach(() => {
  exitCodes = [];
  vi.spyOn(process, "exit").mockImplementation((code) => {
    const n = code === undefined || code === null ? undefined : Number(code);
    exitCodes.push(n);
    throw new ExitSignal(n);
  });
});

afterEach(() => {
  process.argv = originalArgv;
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("style-gen entry", () => {
  it("prints the version and exits 0 for --version", async () => {
    expect(await runCli(["--version"])).toBe(0);
    expect(logger.log).toHaveBeenCalledWith("style-gen v9.9.9");
    expect(generateCommand).not.toHaveBeenCalled();
  });

  it("prints help and exits 0 when no command is given", async () => {
    expect(await runCli([])).toBe(0);
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Commands:"),
    );
  });

  it("exits 1 and names the command when it is unknown", async () => {
    expect(await runCli(["build"])).toBe(1);
    expect(logger.error).toHaveBeenCalledWith("Unknown command: build");
  });

  it("exits 1 on an unknown flag instead of ignoring it", async () => {
    expect(await runCli(["generate", "--them", "t.json"])).toBe(1);
    expect(generateCommand).not.toHaveBeenCalled();
  });

  it("maps generate positionals to theme and out", async () => {
    expect(await runCli(["generate", "a.json", "b.css"])).toBeUndefined();
    expect(generateCommand).toHaveBeenCalledWith({
      theme: "a.json",
      out: "b.css",
    });
  });

  it("lets each generate flag override its positional, key by key", async () => {
    await runCli(["generate", "a.json", "b.css", "--theme", "t.json", "-w"]);
    expect(generateCommand).toHaveBeenCalledWith({
      theme: "t.json",
      out: "b.css",
      watch: true,
    });
  });

  it("passes --out to schema only when given", async () => {
    await runCli(["schema"]);
    await runCli(["schema", "--out", "s.json"]);
    expect(vi.mocked(schemaCommand).mock.calls).toEqual([
      [{}],
      [{ out: "s.json" }],
    ]);
  });

  it("reports an init failure and exits 1", async () => {
    vi.mocked(initCommand).mockRejectedValueOnce(new Error("theme exists"));
    expect(await runCli(["init", "--dark"])).toBe(1);
    expect(initCommand).toHaveBeenCalledWith(
      expect.objectContaining({ dark: true }),
    );
    expect(logger.error).toHaveBeenCalledWith("theme exists");
  });
});
