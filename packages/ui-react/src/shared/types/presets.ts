import type { BoxPreset, ButtonTint } from "design-system-example/recipes";

import type {
  BlurKey,
  BorderWidthKey,
  ColorKey,
  RadiusKey,
  ShadowKey,
  TypographyKey,
  UiTokens,
} from "./tokens";

export type { BoxPreset };

export interface TextPreset<W extends UiTokens> {
  readonly base?: string | undefined;
  readonly defaultType?: TypographyKey<W> | undefined;
  readonly defaultColor?: ColorKey<W> | undefined;
}
export interface ButtonPreset<W extends UiTokens, B extends ColorKey<W>> {
  readonly intents: readonly B[];
  readonly background: ColorKey<W>;
  readonly radius: RadiusKey<W>;
  readonly type: TypographyKey<W>;
  readonly typeLg: TypographyKey<W>;
  readonly focusRing: Readonly<Record<B, string>>;
  readonly tint: Readonly<Record<B, Readonly<Record<ButtonTint, string>>>>;
}
export interface BadgePreset<W extends UiTokens, G extends ColorKey<W>> {
  readonly intents: readonly G[];
  readonly background: ColorKey<W>;
  readonly radius: RadiusKey<W>;
  readonly borderWidth?: BorderWidthKey<W> | undefined;
  readonly type: TypographyKey<W>;
  readonly soft: Readonly<Record<G, string>>;
}
export interface CardPreset<W extends UiTokens> {
  readonly surface: ColorKey<W>;
  readonly background: ColorKey<W>;
  readonly foreground: ColorKey<W>;
  readonly border: ColorKey<W>;
  readonly radius: RadiusKey<W>;
  readonly borderWidth?: BorderWidthKey<W> | undefined;
  readonly shadow: ShadowKey<W>;
}
export interface InputPreset<W extends UiTokens> {
  readonly surface: ColorKey<W>;
  readonly foreground: ColorKey<W>;
  readonly border: ColorKey<W>;
  readonly invalidBorder: ColorKey<W>;
  readonly radius: RadiusKey<W>;
  readonly borderWidth?: BorderWidthKey<W> | undefined;
  readonly type: TypographyKey<W>;
  readonly placeholder: string;
  readonly focus: string;
}
export interface SelectPreset<W extends UiTokens> {
  readonly surface: ColorKey<W>;
  readonly radius: RadiusKey<W>;
  readonly invalidBorder: ColorKey<W>;
  readonly border: string;
}
export interface DialogPreset<W extends UiTokens> {
  readonly surface: ColorKey<W>;
  readonly foreground: ColorKey<W>;
  readonly border: ColorKey<W>;
  readonly radius: RadiusKey<W>;
  readonly borderWidth?: BorderWidthKey<W> | undefined;
  readonly shadow: ShadowKey<W>;
  readonly overlay: string;
  readonly defaultBlur: "none" | BlurKey<W>;
}

/** One app's role map. Every role is optional; an omitted role drops its component. */
export interface UiPresets<
  W extends UiTokens,
  B extends ColorKey<W> = never,
  G extends ColorKey<W> = never,
> {
  readonly box?: BoxPreset | undefined;
  readonly text?: TextPreset<W> | undefined;
  readonly button?: ButtonPreset<W, B> | undefined;
  readonly badge?: BadgePreset<W, G> | undefined;
  readonly card?: CardPreset<W> | undefined;
  readonly input?: InputPreset<W> | undefined;
  readonly select?: SelectPreset<W> | undefined;
  readonly dialog?: DialogPreset<W> | undefined;
}
