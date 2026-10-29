import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import { createDesignTokens } from "../../features/tokens/createDesignTokens";
import { logger } from "../logger";

import { tokensCommand } from "./tokens";

const theme = {
  colors: { primary: "#3B82F6", blue500: "#3b82f6", alias: "$primary" },
  shadows: { sm: "0 1px 2px #0000000d" },
  typography: {
    heroTitle: {
      fontSize: "32px",
      lineHeight: "40px",
      fontWeight: 700,
      letterSpacing: "0",
    },
  },
};

describe("tokensCommand", () => {
  let tmp: string;
  let errorSpy: MockInstance<typeof logger.error>;

  const file = (rel: string): string => path.join(tmp, rel);
  const write = (rel: string, content: string | object): void => {
    fs.mkdirSync(path.dirname(file(rel)), { recursive: true });
    fs.writeFileSync(
      file(rel),
      typeof content === "string" ? content : JSON.stringify(content),
    );
  };

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-tokens-"));
    errorSpy = vi.spyOn(logger, "error").mockImplementation(() => undefined);
    vi.spyOn(logger, "success").mockImplementation(() => undefined);
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // The module's source read back as a plain object literal.
  const readTokens = (rel: string): unknown => {
    const source = fs.readFileSync(file(rel), "utf8");
    const literal = /export const tokens = ([\s\S]*?) as const;/.exec(source);
    return JSON.parse(literal?.[1] ?? "null");
  };

  it("writes theme.tokens.ts next to the theme, equal to createDesignTokens().DesignTokens.Web", () => {
    write("styles/theme.json", theme);

    expect(tokensCommand({ theme: "styles/theme.json" }, tmp)).toBe(0);

    expect(readTokens("styles/theme.tokens.ts")).toEqual(
      createDesignTokens(theme).DesignTokens.Web,
    );
    const source = fs.readFileSync(file("styles/theme.tokens.ts"), "utf8");
    expect(source).toContain("export const tokens = ");
    expect(source).toContain("as const;");
    expect(source).toContain("export type Tokens = typeof tokens;");
  });

  it("keeps camelCased keys and the alias holders, and carries no values", () => {
    write("styles/theme.json", theme);

    tokensCommand({ theme: "styles/theme.json" }, tmp);

    const tokens = readTokens("styles/theme.tokens.ts") as {
      colors: string[];
      typography: string[];
      aliasedColors: string[];
    };
    expect(tokens.colors).toEqual(["primary", "blue500", "alias"]);
    expect(tokens.typography).toEqual(["heroTitle"]);
    expect(tokens.aliasedColors).toEqual(["alias"]);
    expect(
      fs.readFileSync(file("styles/theme.tokens.ts"), "utf8"),
    ).not.toContain("#3B82F6");
  });

  it("honours the generator options from style-gen.config.json (breakpoints)", () => {
    write("styles/theme.json", theme);
    write("style-gen.config.json", {
      theme: "styles/theme.json",
      breakpoints: ["sm", "xl"],
    });

    expect(tokensCommand({}, tmp)).toBe(0);

    expect(
      (readTokens("styles/theme.tokens.ts") as { breakpoints: string[] })
        .breakpoints,
    ).toEqual(["sm", "xl"]);
  });

  it("writes to --out, creating parent directories", () => {
    write("styles/theme.json", theme);

    expect(
      tokensCommand(
        { theme: "styles/theme.json", out: "src/generated/keys.ts" },
        tmp,
      ),
    ).toBe(0);

    expect(fs.existsSync(file("src/generated/keys.ts"))).toBe(true);
    expect(fs.existsSync(file("styles/theme.tokens.ts"))).toBe(false);
  });

  it.each([
    "keys.js",
    "keys.mjs",
    "keys.d.ts",
    "keys.d.mts",
    "keys.d.cts",
    "keys",
  ])(
    "rejects --out %s with exit 1 and writes nothing (the output is TypeScript)",
    (out) => {
      write("styles/theme.json", theme);

      expect(tokensCommand({ theme: "styles/theme.json", out }, tmp)).toBe(1);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("--out must be a .ts, .mts or .cts file"),
      );
      expect(fs.existsSync(file(out))).toBe(false);
    },
  );

  it.each(["keys.ts", "keys.mts", "keys.cts"])("accepts --out %s", (out) => {
    write("styles/theme.json", theme);

    expect(tokensCommand({ theme: "styles/theme.json", out }, tmp)).toBe(0);

    expect(fs.existsSync(file(out))).toBe(true);
  });

  it("does not rewrite the file when its content is already current", () => {
    write("styles/theme.json", theme);
    expect(tokensCommand({ theme: "styles/theme.json" }, tmp)).toBe(0);
    const out = file("styles/theme.tokens.ts");
    const first = fs.statSync(out).ino;

    expect(tokensCommand({ theme: "styles/theme.json" }, tmp)).toBe(0);
    // writeFileAtomic renames a fresh file into place: an unchanged run keeps the inode.
    expect(fs.statSync(out).ino).toBe(first);

    write("styles/theme.json", { ...theme, shadows: { md: "0 2px 4px #000" } });
    expect(tokensCommand({ theme: "styles/theme.json" }, tmp)).toBe(0);
    expect(fs.readFileSync(out, "utf8")).toContain('"md"');
  });

  it("returns 1 with a config error and writes nothing for an invalid config", () => {
    write("styles/theme.json", theme);
    write("style-gen.config.json", { breakpoint: ["xl"] });

    expect(tokensCommand({ theme: "styles/theme.json" }, tmp)).toBe(1);

    expect(errorSpy.mock.calls[0]?.[0]).toMatch(
      /^Invalid config \(style-gen\.config\.json\):/,
    );
    expect(fs.existsSync(file("styles/theme.tokens.ts"))).toBe(false);
  });

  it("returns 1 with the validation error and writes nothing for an invalid theme", () => {
    write("styles/theme.json", { colors: { primary_x: "#fff" } });

    expect(tokensCommand({ theme: "styles/theme.json" }, tmp)).toBe(1);

    expect(errorSpy.mock.calls[0]?.[0]).toMatch(
      /^Invalid theme \(.*styles\/theme\.json\):\ncolors\.primary_x → /s,
    );
    expect(fs.existsSync(file("styles/theme.tokens.ts"))).toBe(false);
  });

  it("returns 1 when the theme is missing", () => {
    expect(tokensCommand({ theme: "styles/missing.json" }, tmp)).toBe(1);

    expect(errorSpy.mock.calls[0]?.[0]).toMatch(/Theme file not found/);
  });

  it("refuses an --out outside the project root", () => {
    write("styles/theme.json", theme);

    expect(
      tokensCommand({ theme: "styles/theme.json", out: "../keys.ts" }, tmp),
    ).toBe(1);

    expect(errorSpy).toHaveBeenCalledWith(
      "--out escapes project root: ../keys.ts",
    );
  });

  it("with a theme outside the project root the default --out escapes it and the hint asks for --out", () => {
    const shared = fs.mkdtempSync(
      path.join(os.tmpdir(), "style-gen-tokens-shared-"),
    );
    try {
      fs.writeFileSync(path.join(shared, "theme.json"), JSON.stringify(theme));

      expect(
        tokensCommand({ theme: path.join(shared, "theme.json") }, tmp),
      ).toBe(1);

      expect(errorSpy.mock.calls[0]?.[0]).toMatch(
        /tokens output escapes project root.*\n💡 Pass --out$/s,
      );
      expect(fs.existsSync(path.join(shared, "theme.tokens.ts"))).toBe(false);

      expect(
        tokensCommand(
          { theme: path.join(shared, "theme.json"), out: "keys.ts" },
          tmp,
        ),
      ).toBe(0);
      expect(fs.existsSync(file("keys.ts"))).toBe(true);
    } finally {
      fs.rmSync(shared, { recursive: true, force: true });
    }
  });
});
