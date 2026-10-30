import { describe, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Button types", () => {
  it("checks intents and the as prop", () => {
    void (<ui.Button color="danger" mt={2} />);
    // @ts-expect-error accent is a colour but not an intent
    void (<ui.Button color="accent" />);
    void (<ui.Button as="a" href="/x" />);
  });
});
