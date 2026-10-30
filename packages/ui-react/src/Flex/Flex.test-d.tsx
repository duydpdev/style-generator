import { describe, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Flex types", () => {
  it("checks the as prop, breakpoints and spacing values", () => {
    void (<ui.Flex as="label" htmlFor="x" />);
    // @ts-expect-error div has no htmlFor
    void (<ui.Flex as="div" htmlFor="x" />);
    void (<ui.Flex gap={{ base: 2, md: 4 }} />);
    // @ts-expect-error xl is not a configured breakpoint
    void (<ui.Flex gap={{ xl: 4 }} />);
    // @ts-expect-error spacing takes numbers only
    void (<ui.Flex mx="auto" />);
  });
});
