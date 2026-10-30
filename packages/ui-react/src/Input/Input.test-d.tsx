import { describe, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Input types", () => {
  it("checks sizes", () => {
    // @ts-expect-error size is sm | md | lg
    void (<ui.Input size={3} />);
  });
});
