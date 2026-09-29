import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from "vitest";

import { logger } from "../logger";

import { doctorCommand } from "./doctor";

const writeProject = (
  tmp: string,
  files: Record<string, string | object>,
): void => {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(
      abs,
      typeof content === "string" ? content : JSON.stringify(content),
    );
  }
};

describe("doctorCommand", () => {
  let tmp: string;
  let origCwd: string;
  let logSpy: MockInstance<typeof logger.log>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-doctor-"));
    origCwd = process.cwd();
    process.chdir(tmp);
    logSpy = vi.spyOn(logger, "log").mockImplementation(() => undefined);
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`__exit_${String(code ?? 0)}__`);
    }) as never);
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  const lines = (): string => logSpy.mock.calls.map((c) => c[0]).join("\n");

  it("v3 valid theme + plugin + output → success path", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/theme.json",
        plugin: "plugins/theme-plugin.ts",
        output: "styles/theme.css",
      },
      "styles/theme.json": {
        colors: { primary: "#3B82F6" },
        typography: {
          h1: {
            fontSize: "32px",
            lineHeight: "40px",
            fontWeight: 700,
            letterSpacing: "0",
          },
        },
      },
      "plugins/theme-plugin.ts": "// stub",
      "styles/theme.css": "text-primary",
    });

    expect(() => {
      doctorCommand();
    }).not.toThrow();
    const out = lines();
    expect(out).toMatch(/Valid JSON, schema OK/);
    expect(out).toMatch(/Everything looks good/);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("v1 nested colors (object values) → schema error naming the offending path, exit 1", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/theme.json",
        plugin: "plugins/theme-plugin.ts",
        output: "styles/theme.css",
      },
      "styles/theme.json": {
        colors: { base: { primary: "#3B82F6" }, text: {}, common: {} },
        typography: {
          h1: {
            fontSize: "32px",
            lineHeight: "40px",
            fontWeight: 700,
            letterSpacing: "0",
          },
        },
      },
      "plugins/theme-plugin.ts": "// stub",
    });

    expect(() => {
      doctorCommand();
    }).toThrow(/__exit_1__/);
    expect(lines()).toMatch(/colors\.base/);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("misspelled 'colours' key → schema error names the offending path, exit 1", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/theme.json",
        plugin: "plugins/theme-plugin.ts",
        output: "styles/theme.css",
      },
      "styles/theme.json": {
        colors: { primary: "#3B82F6" },
        colours: { primary: "#3B82F6" },
      },
      "plugins/theme-plugin.ts": "// stub",
    });

    expect(() => {
      doctorCommand();
    }).toThrow(/__exit_1__/);
    expect(lines()).toMatch(/colours/);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("invalid JSON theme → exit 1 with 'Invalid JSON'", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/theme.json",
        plugin: "plugins/theme-plugin.ts",
        output: "styles/theme.css",
      },
      "styles/theme.json": "{ this is not json",
      "plugins/theme-plugin.ts": "// stub",
    });

    expect(() => {
      doctorCommand();
    }).toThrow(/__exit_1__/);
    expect(lines()).toMatch(/Invalid JSON/);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("missing theme file → exit 1 with 'Not found'", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/missing.json",
        plugin: "plugins/theme-plugin.ts",
        output: "styles/theme.css",
      },
      "plugins/theme-plugin.ts": "// stub",
    });

    expect(() => {
      doctorCommand();
    }).toThrow(/__exit_1__/);
    expect(lines()).toMatch(/Not found/);
  });
});
