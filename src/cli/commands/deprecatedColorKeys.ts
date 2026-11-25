import type { ThemeConfig } from "../../core/themeSchema";

import { DEFAULT_STANDARD } from "./canvas/standardSchema";

/** The v2 grammar states (`Hover`, `Active`, `Selected`), always last in a key. */
const STATES = DEFAULT_STANDARD.grammar?.states ?? [];

/**
 * The v2 name of an `on<Intent>` key and why it is deprecated. A state at the
 * end of the intent moves after `Foreground` (`onPrimaryHover` →
 * `primaryForegroundHover`), as the grammar puts the state last.
 * @param {string} intent - The key without `on`, first letter lower-cased
 * @returns {{ target: string, reason: string }} The v2 name and the reason
 */
const v2Name = (intent: string): { target: string; reason: string } => {
  const state = STATES.find(
    (name) => intent.endsWith(name) && intent.length > name.length,
  );
  if (state === undefined)
    return {
      target: `${intent}Foreground`,
      reason: `contrastText reads ${intent}Foreground first and drops on<Intent> in 9.0`,
    };
  return {
    target: `${intent.slice(0, -state.length)}Foreground${state}`,
    reason:
      "on<Intent> keys are dropped in 9.0 and a state comes last in the v2 name",
  };
};

/**
 * Doctor warnings for the deprecated `on<Intent>` contrast keys: every
 * `colors` key `on<Intent>` whose `<intent>` is also a colour. `contrastText`
 * reads `<intent>Foreground` first and drops the `on<Intent>` lookup in 9.0.
 * A key such as `onboarding` (no upper-case letter after `on`) or an
 * `onCard` without a `card` colour is not a contrast key and is not warned.
 * When the v2 name already exists, renaming would collide, so the warning
 * asks for a merge instead.
 * @param {ThemeConfig} theme - A theme that already passed `ThemeSchema`
 * @returns {string[]} One warning per deprecated key
 */
export const findDeprecatedColorKeys = (theme: ThemeConfig): string[] => {
  const colors = Object.keys(theme.colors);
  return colors.flatMap((key) => {
    if (!/^on[A-Z]/.test(key)) return [];
    const intent = key.charAt(2).toLowerCase() + key.slice(3);
    if (!colors.includes(intent)) return [];
    const { target, reason } = v2Name(intent);
    const fix = colors.includes(target)
      ? `${target} exists: merge ${key} into it and remove ${key}`
      : `rename to ${target}`;
    return [`colors.${key} is deprecated: ${reason}; ${fix}`];
  });
};
