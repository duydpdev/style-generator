import type { ThemeConfig } from "../../core/themeSchema";

/**
 * Doctor warnings for the deprecated `on<Intent>` contrast keys: every
 * `colors` key `on<Intent>` whose `<intent>` is also a colour. `contrastText`
 * reads `<intent>Foreground` first and drops the `on<Intent>` lookup in 9.0.
 * A key such as `onboarding` (no upper-case letter after `on`) or an
 * `onCard` without a `card` colour is not a contrast key and is not warned.
 * When `<intent>Foreground` already exists, renaming would collide, so the
 * warning asks for a merge instead.
 * @param {ThemeConfig} theme - A theme that already passed `ThemeSchema`
 * @returns {string[]} One warning per deprecated key
 */
export const findDeprecatedColorKeys = (theme: ThemeConfig): string[] => {
  const colors = Object.keys(theme.colors);
  return colors.flatMap((key) => {
    if (!/^on[A-Z]/.test(key)) return [];
    const intent = key.charAt(2).toLowerCase() + key.slice(3);
    if (!colors.includes(intent)) return [];
    const target = `${intent}Foreground`;
    const fix = colors.includes(target)
      ? `${target} exists: merge ${key} into it and remove ${key}`
      : `rename to ${target}`;
    return [
      `colors.${key} is deprecated: contrastText reads ${target} first and drops on<Intent> in 9.0; ${fix}`,
    ];
  });
};
