import { gzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { coverageCost, themeClassGroups } from "../cli/coverageCost";
import { defineTheme } from "../core/defineTheme";
import { generate } from "../core/generate";

import { compileFixtureCss } from "./compileFixtureCss";

const theme = defineTheme({
  colors: {
    primary: "#3B82F6",
    primaryHover: "#2563EB",
    secondary: "#64748B",
    danger: "#DC2626",
    line: "#E2E8F0",
    surface: "#FFFFFF",
  },
});

const gzip = (css: string): number => gzipSync(css).length;

describe("coverageCost against the real Tailwind engine", () => {
  it("prices a group at the gzip bytes that dropping its prefix saves", async () => {
    const full = await compileFixtureCss(generate(theme).css, []);
    const withoutRing = await compileFixtureCss(
      generate(theme, {
        coverage: {
          colors: {
            prefixes: [
              "bg",
              "text",
              "border",
              "outline",
              "divide",
              "placeholder",
            ],
          },
        },
      }).css,
      [],
    );

    const groups = themeClassGroups(theme);
    const before = coverageCost([{ file: "a.css", css: full }], groups);
    const after = coverageCost([{ file: "b.css", css: withoutRing }], groups);

    const ring = before.find((c) => c.group.prefix === "ring");
    expect(ring).toBeDefined();
    const saved = gzip(full) - gzip(withoutRing);
    expect(saved).toBeGreaterThan(0);
    expect(Math.abs((ring?.bytes ?? 0) - saved) / saved).toBeLessThan(0.15);
    expect(after.some((c) => c.group.prefix === "ring")).toBe(false);
  });
});
