import { afterEach, describe, expect, it, vi } from "vitest";

const runCli = vi.hoisted(() => vi.fn());
vi.mock("./run", () => ({ runCli }));

const originalArgv = process.argv;
const originalExitCode = process.exitCode;

afterEach(() => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  runCli.mockReset();
  vi.resetModules();
});

describe("style-gen entry", () => {
  it("runs the CLI with argv and cwd and sets the exit code instead of exiting", async () => {
    process.argv = ["node", "style-gen", "doctor", "--x"];
    runCli.mockResolvedValue(3);
    const exit = vi.spyOn(process, "exit");

    await import("./index");

    expect(runCli).toHaveBeenCalledExactlyOnceWith(
      ["doctor", "--x"],
      process.cwd(),
    );
    expect(process.exitCode).toBe(3);
    expect(exit).not.toHaveBeenCalled();
  });
});
