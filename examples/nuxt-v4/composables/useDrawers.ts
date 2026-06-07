/** Shared open/close state for the JSON drawer + tweaks panel (UI-only). */
export const useDrawers = () => {
  const jsonOpen = useState<boolean>("json-open", () => false);
  const tweaksOpen = useState<boolean>("tweaks-open", () => false);
  return { jsonOpen, tweaksOpen };
};
