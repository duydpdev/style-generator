import type { createBadge } from "../../Badge";
import type { createBox } from "../../Box";
import type { createButton } from "../../Button";
import type { createCard } from "../../Card";
import type { createCode } from "../../Code";
import type { createContainer } from "../../Container";
import type { createDialog } from "../../Dialog";
import type { createFlex } from "../../Flex";
import type { createGrid } from "../../Grid";
import type { createInput } from "../../Input";
import type { createLink } from "../../Link";
import type { createList } from "../../List";
import type { createListItem } from "../../ListItem";
import type { createSelect } from "../../Select";
import type { createStack } from "../../Stack";
import type { createText } from "../../Text";

import type { UiTokens } from "./tokens";

/** Always returned: these need tokens only. */
export interface LayoutUi<W extends UiTokens> {
  readonly Box: ReturnType<typeof createBox<W>>;
  readonly Flex: ReturnType<typeof createFlex<W>>;
  readonly Stack: ReturnType<typeof createStack<W>>;
  readonly Grid: ReturnType<typeof createGrid<W>>;
  readonly Container: ReturnType<typeof createContainer<W>>;
  readonly Text: ReturnType<typeof createText<W>>;
  readonly Link: ReturnType<typeof createLink<W>>;
  readonly List: ReturnType<typeof createList<W>>;
  readonly ListItem: ReturnType<typeof createListItem<W>>;
  readonly Code: ReturnType<typeof createCode<W>>;
}

/** Returned per declared preset role. */
export interface ControlUi<
  W extends UiTokens,
  B extends string,
  G extends string,
> {
  readonly Button: ReturnType<typeof createButton<W, B>>;
  readonly Badge: ReturnType<typeof createBadge<W, G>>;
  readonly Card: ReturnType<typeof createCard<W>>;
  readonly Input: ReturnType<typeof createInput>;
  readonly Select: ReturnType<typeof createSelect>;
  readonly Dialog: ReturnType<typeof createDialog<W>>;
}

/** Preset role → the component it enables. */
export interface RoleComponent {
  readonly button: "Button";
  readonly badge: "Badge";
  readonly card: "Card";
  readonly input: "Input";
  readonly select: "Select";
  readonly dialog: "Dialog";
}

export type ControlRole = keyof RoleComponent;

/** The control roles `P` declares with a value (absent or `undefined` → not provided). */
export type ProvidedRole<P> = {
  [K in ControlRole]: K extends keyof P
    ? undefined extends P[K]
      ? never
      : K
    : never;
}[ControlRole];

/** What `createUi(tokens, presets)` returns. */
export type Ui<
  W extends UiTokens,
  B extends string,
  G extends string,
  P,
> = LayoutUi<W> & Pick<ControlUi<W, B, G>, RoleComponent[ProvidedRole<P>]>;
