import { describe, it, expect } from "vitest";

import { axisAttributeName } from "./axisAttributeName";

describe("axisAttributeName", () => {
  it("defaults to data-<axis-kebab>", () => {
    expect(axisAttributeName("theme")).toBe("data-theme");
    expect(axisAttributeName("highContrast")).toBe("data-high-contrast");
  });
  it("is safe for Object.prototype key names", () => {
    expect(axisAttributeName("constructor")).toBe("data-constructor");
    expect(axisAttributeName("toString")).toBe("data-to-string");
  });
});
