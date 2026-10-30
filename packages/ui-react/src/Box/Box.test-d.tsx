import type { RefObject } from "react";
import { describe, it } from "vitest";

import { ui } from "../../tests/ui";

declare const divRef: RefObject<HTMLDivElement | null>;

describe("Box types", () => {
  it("checks token keys and refs", () => {
    void (<ui.Box backgroundColor="surface" />);
    // @ts-expect-error not a colour key
    void (<ui.Box backgroundColor="nope" />);
    // @ts-expect-error not a radius key
    void (<ui.Box rounded="xxl" />);
    void (<ui.Box ref={divRef} />);
    // @ts-expect-error a div ref on a button
    void (<ui.Box as="button" ref={divRef} />);
  });
});
