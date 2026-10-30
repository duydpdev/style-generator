import type { JSX } from "react";

import type { PolymorphicComponent } from "./polymorphic";
import type {
  BadgeOwnProps,
  BoxOwnProps,
  ButtonOwnProps,
  CardOwnProps,
  ContainerOwnProps,
  DialogProps,
  FlexOwnProps,
  GridOwnProps,
  InputProps,
  SelectProps,
  TextOwnProps,
} from "./props";
import type { UiTokens } from "./tokens";

/** Always returned: these need tokens only. */
export interface LayoutUi<W extends UiTokens> {
  readonly Box: PolymorphicComponent<"div", BoxOwnProps<W>>;
  readonly Flex: PolymorphicComponent<"div", FlexOwnProps<W>>;
  readonly Stack: PolymorphicComponent<"div", FlexOwnProps<W>>;
  readonly Grid: PolymorphicComponent<"div", GridOwnProps<W>>;
  readonly Container: PolymorphicComponent<"div", ContainerOwnProps<W>>;
  readonly Text: PolymorphicComponent<"p", TextOwnProps<W>>;
}

/** Returned per declared preset role. */
export interface ControlUi<
  W extends UiTokens,
  B extends string,
  G extends string,
> {
  readonly Button: PolymorphicComponent<"button", ButtonOwnProps<W, B>>;
  readonly Badge: PolymorphicComponent<"span", BadgeOwnProps<W, G>>;
  readonly Card: PolymorphicComponent<"div", CardOwnProps<W>>;
  readonly Input: (props: InputProps) => JSX.Element;
  readonly Select: (props: SelectProps) => JSX.Element;
  readonly Dialog: (props: DialogProps<W>) => JSX.Element | null;
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
