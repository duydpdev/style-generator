import { describe, it, expect } from "vitest";

import { axisAttributeName } from "./axisAttributeName";

describe("axisAttributeName", () => {
  it("defaults to data-<axis-kebab>", () => {
    expect(axisAttributeName("theme")).toBe("data-theme");
    expect(axisAttributeName("highContrast")).toBe("data-high-contrast");
  });
  it("prefers the mapped attribute, per axis", () => {
    const attribute = { theme: "data-mode" };
    expect(axisAttributeName("theme", attribute)).toBe("data-mode");
    expect(axisAttributeName("palette", attribute)).toBe("data-palette");
  });
  it("ignores inherited Object.prototype keys of the map", () => {
    expect(axisAttributeName("constructor", {})).toBe("data-constructor");
    expect(axisAttributeName("toString", {})).toBe("data-to-string");
  });
});
