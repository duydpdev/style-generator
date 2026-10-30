import { describe, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Link types", () => {
  it("checks colour keys and the underline mode", () => {
    void (<ui.Link href="/x" color="primary" underline="always" />);
    // @ts-expect-error not a colour key
    void (<ui.Link href="/x" color="nope" />);
    // @ts-expect-error not an underline mode
    void (<ui.Link href="/x" underline="dotted" />);
  });
});
