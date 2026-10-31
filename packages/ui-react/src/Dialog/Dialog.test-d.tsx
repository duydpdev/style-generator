import { describe, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Dialog types", () => {
  it("checks blur keys and required props", () => {
    void (<ui.Dialog open onClose={() => undefined} blur="md" />);
    // @ts-expect-error not a blur key
    void (<ui.Dialog open onClose={() => undefined} blur="xl" />);
    // @ts-expect-error onClose is required
    void (<ui.Dialog open />);
  });
});
