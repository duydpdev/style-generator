import type { StyleGuideState, TweakSetter } from "../data/types";

const INITIAL: StyleGuideState = {
  palette: "cobalt",
  theme: "light",
  voice: "editorial",
  geometry: "soft",
  surface: "lifted",
};

/**
 * Shared, SSR-safe style-guide state. `useState` seeds the same INITIAL value on
 * the server and the client, so the `<html data-*>` attributes (applied via
 * `useHead` in `app.vue`) match across hydration — no mismatch warning.
 */
export const useStyleGuide = () => {
  const state = useState<StyleGuideState>("style-guide", () => ({
    ...INITIAL,
  }));

  const setTweak: TweakSetter = (key, value) => {
    state.value = { ...state.value, [key]: value };
  };

  const reset = () => {
    state.value = { ...INITIAL };
  };

  const toggleTheme = () => {
    setTweak("theme", state.value.theme === "dark" ? "light" : "dark");
  };

  return { state, setTweak, reset, toggleTheme };
};
