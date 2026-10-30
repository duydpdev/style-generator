import { describe, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Code types", () => {
  it("checks typography keys", () => {
    void (<ui.Code type="text16Medium" color="muted" />);
    // @ts-expect-error not a typography key
    void (<ui.Code type="nope" />);
  });
});
