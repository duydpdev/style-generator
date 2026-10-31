import { describe, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Container types", () => {
  it("has no horizontal margin prop", () => {
    // @ts-expect-error the container centres itself
    void (<ui.Container mx={4} />);
  });
});
