import { Link, NavLink } from "react-router-dom";

import { VERSION } from "../data/version";
import { Box, Flex, Stack, Text } from "../ui";

export type ActiveRoute = "landing" | "docs" | "examples";

export const NAV_ID = "topbar-nav";

interface Props {
  activeRoute: ActiveRoute;
  menuOpen: boolean;
  closeMenu: () => void;
}

/**
 * The brand link and the page navigation (a dropdown under 860px).
 * @param root0 - Component props
 * @param root0.activeRoute - Route whose link is marked active
 * @param root0.menuOpen - Whether the dropdown is open
 * @param root0.closeMenu - Closes the dropdown after a navigation
 */
export function TopbarNav({
  activeRoute,
  menuOpen,
  closeMenu,
}: Readonly<Props>) {
  return (
    <Flex align="center" minWidth={0}>
      <Flex as={Link} to="/" data-part="brand" align="center" gap={3}>
        <Box
          data-part="brand-mark"
          position="relative"
          width={26}
          height={26}
        />
        <Stack data-part="brand-meta">
          <b>@duydpdev/style-generator</b>
          <Text as="span" color="muted">
            v{VERSION} · tailwind v4
          </Text>
        </Stack>
      </Flex>
      <Flex
        as="nav"
        id={NAV_ID}
        data-part={`topbar-nav${menuOpen ? " open" : ""}`}
        aria-label="Pages"
        align="center"
        gap={0.5}
        ml={{ base: 0, lg: 7 }}
        pt={{ base: 2, lg: 0 }}
        px={{ base: 4, lg: 0 }}
        pb={{ base: 3, lg: 0 }}
      >
        <NavLink
          to="/"
          end
          className={activeRoute === "landing" ? "active" : ""}
          onClick={closeMenu}
        >
          Landing
        </NavLink>
        <NavLink
          to="/docs"
          className={activeRoute === "docs" ? "active" : ""}
          onClick={closeMenu}
        >
          Docs
        </NavLink>
        <NavLink
          to="/examples/v4"
          className={activeRoute === "examples" ? "active" : ""}
          onClick={closeMenu}
        >
          Examples
        </NavLink>
      </Flex>
    </Flex>
  );
}
