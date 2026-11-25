import type { ThemeConfig } from "../../core/themeSchema";

import { DEFAULT_STANDARD } from "./canvas/standardSchema";

/** The v2 grammar states (`Hover`, `Active`, `Selected`), always last in a key. */
const STATES = DEFAULT_STANDARD.grammar?.states ?? [];

/**
 * The intent without a trailing grammar state (`primaryHover` → `primary`).
 * @param {string} intent - The key without `on`, first letter lower-cased
 * @returns {string} The intent, or the input when it ends in no state
 */
const withoutState = (intent: string): string => {
  const state = STATES.find(
    (name) => intent.endsWith(name) && intent.length > name.length,
  );
  return state === undefined ? intent : intent.slice(0, -state.length);
};

/**
 * The v2 name of an `on<Intent>` key. A state at the end of the intent moves
 * after `Foreground` (`onPrimaryHover` → `primaryForegroundHover`), as the
 * grammar puts the state last.
 * @param {string} intent - The key without `on`, first letter lower-cased
 * @returns {string} The v2 name
 */
const v2Name = (intent: string): string => {
  const base = withoutState(intent);
  return `${base}Foreground${intent.slice(base.length)}`;
};

/**
 * Doctor warnings for the `on<Intent>` contrast keys that 9.0 no longer
 * reads: every `colors` key `on<Intent>` whose `<intent>` is also a colour,
 * or whose `<intent>` minus a trailing state is (`onPrimaryHover` with `primary`).
 * `contrastText` reads only `<intent>Foreground`, so such a key falls back.
 * A key such as `onboarding` (no upper-case letter after `on`) or an
 * `onCard` without a `card` colour is not a contrast key and is not warned.
 * A key with a state names its stateless key, which is the one
 * `contrastText` read. When the v2 name already exists, renaming would
 * collide, so the warning asks for a merge instead.
 * @param {ThemeConfig} theme - A theme that already passed `ThemeSchema`
 * @returns {string[]} One warning per `on<Intent>` key
 */
export const findDeprecatedColorKeys = (theme: ThemeConfig): string[] => {
  const colors = Object.keys(theme.colors);
  return colors.flatMap((key) => {
    if (!/^on[A-Z]/.test(key)) return [];
    const intent = key.charAt(2).toLowerCase() + key.slice(3);
    if (!colors.includes(intent) && !colors.includes(withoutState(intent)))
      return [];
    const target = v2Name(intent);
    const fix = colors.includes(target)
      ? `${target} exists: merge ${key} into it and remove ${key}`
      : `rename to ${target}`;
    const stateLength = intent.length - withoutState(intent).length;
    const reason =
      stateLength === 0
        ? "is no longer read by contrastText in 9.0"
        : `is a state of ${key.slice(0, -stateLength)}, which contrastText no longer reads in 9.0 (the state goes last)`;
    return [`colors.${key} ${reason}; ${fix}`];
  });
};
