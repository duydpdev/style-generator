import { Flex } from "../ui";

import { Menu, Moon, Sun } from "./icon";
import { NAV_ID } from "./topbar-nav";

interface Props {
  dark: boolean;
  menuOpen: boolean;
  onToggleTheme: () => void;
  onToggleMenu: () => void;
}

/**
 * Theme toggle, repository links and the mobile menu button.
 * @param root0 - Component props
 * @param root0.dark - Whether the dark theme is applied
 * @param root0.menuOpen - Whether the nav dropdown is open
 * @param root0.onToggleTheme - Switches the theme
 * @param root0.onToggleMenu - Opens or closes the nav dropdown
 */
export function TopbarActions({
  dark,
  menuOpen,
  onToggleTheme,
  onToggleMenu,
}: Readonly<Props>) {
  return (
    <Flex data-part="topbar-actions" align="center" gap={1.5}>
      <Flex
        as="button"
        type="button"
        data-part="btn btn-ghost"
        align="center"
        gap={1.5}
        px={3}
        py={2}
        onClick={onToggleTheme}
        aria-label="Toggle theme"
        aria-pressed={dark}
        title={dark ? "Switch to light theme" : "Switch to dark theme"}
      >
        {dark ? <Moon /> : <Sun />}
      </Flex>
      <Flex
        as="a"
        data-part="btn btn-outline"
        align="center"
        gap={1.5}
        px={3}
        py={2}
        href="https://github.com/duydpdev/style-generator"
        target="_blank"
        rel="noopener noreferrer"
      >
        GitHub ↗
      </Flex>
      <Flex
        as="a"
        data-part="btn btn-primary"
        align="center"
        gap={1.5}
        px={3}
        py={2}
        href="https://github.com/duydpdev/style-generator/pkgs/npm/style-generator"
        target="_blank"
        rel="noopener noreferrer"
      >
        package ↗
      </Flex>
      <Flex
        as="button"
        type="button"
        data-part="btn btn-ghost topbar-menu"
        align="center"
        gap={1.5}
        px={3}
        py={2}
        aria-label="Menu"
        aria-expanded={menuOpen}
        aria-controls={NAV_ID}
        onClick={onToggleMenu}
      >
        <Menu />
      </Flex>
    </Flex>
  );
}
