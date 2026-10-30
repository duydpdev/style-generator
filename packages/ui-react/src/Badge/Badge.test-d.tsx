import { describe, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Badge types", () => {
  it("checks variants", () => {
    // @ts-expect-error not a variant
    void (<ui.Badge variant="ghost" />);
  });
});
