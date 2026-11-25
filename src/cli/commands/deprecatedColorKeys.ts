import type { ThemeConfig } from "../../core/themeSchema";

import { DEFAULT_STANDARD } from "./canvas/standardSchema";

/** The v2 grammar states (`Hover`, `Active`, `Selected`), always last in a key. */
const STATES = DEFAULT_STANDARD.grammar?.states ?? [];

/**
 * The v2 name of an `on<Intent>` key. A state at the end of the intent moves
 * after `Foreground` (`onPrimaryHover` → `primaryForegroundHover`), as the
 * grammar puts the state last.
 * @param {string} intent - The key without `on`, first letter lower-cased
 * @returns {string} The v2 name
 */
const v2Name = (intent: string): string => {
  const state = STATES.find(
    (name) => intent.endsWith(name) && intent.length > name.length,
  );
  return state === undefined
    ? `${intent}Foreground`
    : `${intent.slice(0, -state.length)}Foreground${state}`;
};

/**
 * Doctor warnings for the `on<Intent>` contrast keys that 9.0 no longer
 * reads: every `colors` key `on<Intent>` whose `<intent>` is also a colour.
 * `contrastText` reads only `<intent>Foreground`, so such a key falls back.
 * A key such as `onboarding` (no upper-case letter after `on`) or an
 * `onCard` without a `card` colour is not a contrast key and is not warned.
 * When the v2 name already exists, renaming would collide, so the warning
 * asks for a merge instead.
 * @param {ThemeConfig} theme - A theme that already passed `ThemeSchema`
 * @returns {string[]} One warning per `on<Intent>` key
 */
export const findDeprecatedColorKeys = (theme: ThemeConfig): string[] => {
  const colors = Object.keys(theme.colors);
  return colors.flatMap((key) => {
    if (!/^on[A-Z]/.test(key)) return [];
    const intent = key.charAt(2).toLowerCase() + key.slice(3);
    if (!colors.includes(intent)) return [];
    const target = v2Name(intent);
    const fix = colors.includes(target)
      ? `${target} exists: merge ${key} into it and remove ${key}`
      : `rename to ${target}`;
    return [`colors.${key} no longer produces a text colour in 9.0; ${fix}`];
  });
};
