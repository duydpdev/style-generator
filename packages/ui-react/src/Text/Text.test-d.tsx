import { describe, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Text types", () => {
  it("checks typography keys and spacing values", () => {
    void (<ui.Text type="text16Medium" color="muted" mb={2} />);
    // @ts-expect-error not a typography key
    void (<ui.Text type="h1" />);
    // @ts-expect-error spacing takes numbers only
    void (<ui.Text mb="2" />);
  });
});
