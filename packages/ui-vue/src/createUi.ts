import {
  createCn,
  type BadgePreset as BadgeRole,
  type BoxPreset,
  type ButtonPreset as ButtonRole,
  type CardPreset as CardRole,
  type CodePreset as CodeRole,
  type DialogPreset as DialogRole,
  type InputPreset as InputRole,
  type SelectPreset as SelectRole,
  type TextPreset as TextRole,
} from "design-system-example/recipes";

import { createBadge, createBadgeStyles } from "./Badge";
import { createBox, createBoxStyles } from "./Box";
import { createButton, createButtonStyles } from "./Button";
import { createCard, createCardStyles } from "./Card";
import { createCode, createCodeStyles } from "./Code";
import { createContainer, createContainerStyles } from "./Container";
import { createDialog, createDialogStyles } from "./Dialog";
import { createFlex, createFlexStyles } from "./Flex";
import { createGrid, createGridStyles } from "./Grid";
import { createInput, createInputStyles } from "./Input";
import { createLink, createLinkStyles } from "./Link";
import { createList, createListStyles } from "./List";
import { createListItem } from "./ListItem";
import { createSelect, createSelectStyles } from "./Select";
import type { ColorKey, Ui, UiPresets, UiTokens } from "./shared/types";
import { createStack } from "./Stack";
import { createText, createTextStyles } from "./Text";

/** The presets as the component bodies read them (generic-free factory shapes). */
interface Roles {
  readonly box?: BoxPreset | undefined;
  readonly text?: TextRole | undefined;
  readonly code?: CodeRole | undefined;
  readonly button?: ButtonRole | undefined;
  readonly badge?: BadgeRole | undefined;
  readonly card?: CardRole | undefined;
  readonly input?: InputRole | undefined;
  readonly select?: SelectRole | undefined;
  readonly dialog?: DialogRole | undefined;
}

/**
 * Bind every component to one app's tokens (`createDesignTokens(theme, options).DesignTokens.Web`)
 * and role presets. Box/Flex/Stack/Grid/Container/Text/Link/List/ListItem/Code are always
 * returned; Button, Badge, Card, Input, Select and Dialog only when `presets` declares their
 * role. Call once per app.
 */
export function createUi<
  W extends UiTokens,
  B extends ColorKey<W> = never,
  G extends ColorKey<W> = never,
  const P extends UiPresets<W, B, G> = UiPresets<W, B, G>,
>(tokens: W, presets: P & UiPresets<W, B, G>): Ui<W, B, G, P> {
  const roles = presets as Roles;
  const cn = createCn(tokens);
  const spacing = tokens.spacingProperties;
  const { box, layout } = createBoxStyles(tokens, roles.box);
  const flex = { cn, spacing, layout, ...createFlexStyles() };
  const ui: Record<string, unknown> = {
    Box: createBox<W>({ cn, spacing, box }),
    Flex: createFlex<W>(flex, "row"),
    Stack: createStack<W>(flex),
    Grid: createGrid<W>({ cn, spacing, layout, ...createGridStyles(tokens) }),
    Container: createContainer<W>({
      cn,
      spacing,
      layout,
      ...createContainerStyles(),
    }),
    Text: createText<W>({
      cn,
      spacing,
      ...createTextStyles(tokens, roles.text),
    }),
    Link: createLink<W>({ cn, spacing, ...createLinkStyles(tokens) }),
    List: createList<W>({ cn, spacing, layout, ...createListStyles() }),
    ListItem: createListItem<W>({ cn, spacing, layout }),
    Code: createCode<W>({
      cn,
      spacing,
      ...createCodeStyles(tokens, roles.code),
    }),
  };
  if (roles.button)
    ui.Button = createButton<W, B>({
      cn,
      spacing,
      ...createButtonStyles(tokens, roles.button),
    });
  if (roles.badge)
    ui.Badge = createBadge<W, G>({
      cn,
      spacing,
      ...createBadgeStyles(tokens, roles.badge),
    });
  if (roles.card)
    ui.Card = createCard<W>({
      cn,
      spacing,
      ...createCardStyles(tokens, roles.card),
    });
  if (roles.input)
    ui.Input = createInput({
      cn,
      ...createInputStyles(tokens, roles.input),
    });
  if (roles.select)
    ui.Select = createSelect({
      cn,
      ...createSelectStyles(tokens, roles.select),
    });
  if (roles.dialog)
    ui.Dialog = createDialog<W>({
      cn,
      ...createDialogStyles(tokens, roles.dialog),
    });
  // The component factories return concrete types; the typed surface is `Ui`, restored once here.
  return ui as unknown as Ui<W, B, G, P>;
}
