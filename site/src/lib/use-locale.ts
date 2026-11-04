import { useLocation } from "react-router-dom";

import type { Locale } from "./locale";
import { localeOfPath } from "./locale";

/** Locale of the current route: `/vi/docs/…` is `vi`, everything else `en`. */
export function useLocale(): Locale {
  return localeOfPath(useLocation().pathname);
}
