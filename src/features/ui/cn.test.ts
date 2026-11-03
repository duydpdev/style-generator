import { describe, expect, it } from "vitest";

import { createCn } from "./cn";

const cn = createCn({
  typography: ["text10Light", "heading1"],
  shadows: ["card"],
  backDropBlurs: [],
  borderRadius: ["pill"],
  borderWidth: ["thin"],
});

describe("createCn", () => {
  it("keeps the last class of a group that contains custom tokens", () => {
    expect(cn("text-10-light", "heading-1")).toBe("heading-1");
    expect(cn("rounded-lg", "rounded-pill")).toBe("rounded-pill");
    expect(cn("shadow-card", "shadow-lg")).toBe("shadow-lg");
  });

  it("keeps a custom border width next to a border color", () => {
    expect(cn("border-thin", "border-primary")).toBe(
      "border-thin border-primary",
    );
  });

  it("accepts clsx inputs (falsy values, arrays, objects)", () => {
    expect(
      cn("p-2", false, undefined, ["p-4"], { flex: true, grid: false }),
    ).toBe("p-4 flex");
  });
});
