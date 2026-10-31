import { describe, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Grid types", () => {
  it("checks breakpoints", () => {
    void (<ui.Grid columns={{ base: 1, lg: 3 }} />);
    // @ts-expect-error xl is not a configured breakpoint
    void (<ui.Grid columns={{ xl: 2 }} />);
  });
});
