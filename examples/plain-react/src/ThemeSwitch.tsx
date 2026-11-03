import { themeAxisAttributes } from "@duydpdev/style-generator/recipes";
import { useEffect, useState } from "react";
import type { JSX } from "react";

import type { theme } from "./theme";
import { Button } from "./ui/button";

/** `{ "data-theme": "dark" }`; the light theme is the base theme (no attribute). */
const DARK = themeAxisAttributes<typeof theme>({ theme: "dark" });

/** Light/dark toggle: sets or removes the `theme` axis attribute on `<html>`. */
export function ThemeSwitch(): JSX.Element {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(DARK)) {
      if (dark) root.setAttribute(name, value);
      else root.removeAttribute(name);
    }
  }, [dark]);

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={dark}
      onClick={() => {
        setDark((on) => !on);
      }}
    >
      Dark mode
    </Button>
  );
}
