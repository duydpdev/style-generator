import type { ThemeConfig } from "../../core/themeSchema";

import { DEFAULT_STANDARD } from "./canvas/standardSchema";

/** The v2 grammar states (`Hover`, `Active`, `Selected`), always last in a key. */
const STATES = DEFAULT_STANDARD.grammar?.states ?? [];

// `primaryHover` → `primary`; the input when it ends in no state.
const withoutState = (intent: string): string => {
  const state = STATES.find(
    (name) => intent.endsWith(name) && intent.length > name.length,
  );
  return state === undefined ? intent : intent.slice(0, -state.length);
};

// The state goes last: `onPrimaryHover` → `primaryForegroundHover`.
const v2Name = (intent: string): string => {
  const base = withoutState(intent);
  return `${base}Foreground${intent.slice(base.length)}`;
};

/**
 * Doctor warnings for `on<Intent>` keys 9.0 no longer reads (`contrastText` reads
 * only `<intent>Foreground`): `<intent>`, or it minus a trailing state, is a colour.
 * An existing v2 name gets a merge hint instead of a rename.
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
