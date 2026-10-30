import { describe, it } from "vitest";

import { ui } from "../../tests/ui";

describe("List types", () => {
  it("checks the marker", () => {
    void (<ui.List marker="disc" position="inside" />);
    // @ts-expect-error not a marker
    void (<ui.List marker="square" />);
    void (<ui.ListItem p={2} />);
  });
});
