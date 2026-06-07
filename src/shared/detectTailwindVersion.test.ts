import { describe, it, expect } from "vitest";

import { detectTailwindVersion } from "./detectTailwindVersion";

describe("detectTailwindVersion", () => {
  it("returns 4 for v4.x", () => {
    expect(detectTailwindVersion(() => ({ version: "4.2.1" }))).toBe(4);
  });

  it("returns 3 for v3.x", () => {
    expect(detectTailwindVersion(() => ({ version: "3.4.1" }))).toBe(3);
  });

  it("returns 3 when version field missing", () => {
    expect(detectTailwindVersion(() => ({}))).toBe(3);
  });

  it("returns 3 when loader throws (package not installed)", () => {
    expect(
      detectTailwindVersion(() => {
        throw new Error("Cannot find module 'tailwindcss/package.json'");
      }),
    ).toBe(3);
  });

  it("default loader (no arg) reads real tailwindcss devDep and returns 3|4", () => {
    expect([3, 4]).toContain(detectTailwindVersion());
  });
});
