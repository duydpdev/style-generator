import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";

import { Box, Container, Flex, Text } from "../ui";

import { TopbarActions } from "./topbar-actions";
import { type ActiveRoute, TopbarNav } from "./topbar-nav";

interface Props {
  activeChapter: { num: string; label: string } | null;
  onToggleTheme: () => void;
  activeRoute?: ActiveRoute;
}

const PAGE_MAX_WIDTH =
  "calc(var(--content-w) + var(--sidebar-w) + var(--gutter) * 2)";

/**
 * Subscribes to the `data-theme` attribute of <html>, which every page's
 * `useTheme()` writes, so the topbar reflects the theme without owning it.
 * @param {() => void} onChange - Called whenever the attribute changes
 * @returns {() => void} Unsubscribe function
 */
function subscribeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => {
    observer.disconnect();
  };
}

/**
 * @returns {boolean} Whether the dark theme is currently applied
 */
function isDarkTheme(): boolean {
  return document.documentElement.dataset.theme === "dark";
}

export function Topbar({
  activeChapter,
  onToggleTheme,
  activeRoute = "landing",
}: Readonly<Props>) {
  const showReading = activeChapter !== null;
  const dark = useSyncExternalStore(subscribeTheme, isDarkTheme);
  const { pathname } = useLocation();
  // The dropdown is open only for the route it was opened on, so any route
  // change closes it without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const menuOpen = openAt === pathname;
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenAt(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      const header = headerRef.current;
      if (header && event.target instanceof Node) {
        if (!header.contains(event.target)) setOpenAt(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  const closeMenu = () => {
    setOpenAt(null);
  };

  return (
    <Box as="header" data-part="topbar" position="sticky" ref={headerRef}>
      <Container maxWidth={PAGE_MAX_WIDTH}>
        <Flex
          data-part="topbar-inner"
          align="center"
          justify="between"
          height={60}
          gap={6}
          px={8}
        >
          <TopbarNav
            activeRoute={activeRoute}
            menuOpen={menuOpen}
            closeMenu={closeMenu}
          />

          <Flex
            data-part={`now-reading${showReading ? " visible" : ""}`}
            align="center"
            gap={2.5}
            py={1.25}
            px={3}
            rounded="pill"
          >
            <Box
              as="span"
              data-part="pulse"
              width={6}
              height={6}
              backgroundColor="success"
            />
            Reading{" "}
            <Text as="span" data-part="now-ch" color="foreground">
              {activeChapter
                ? `Ch. ${activeChapter.num} — ${activeChapter.label}`
                : "— Cover"}
            </Text>
          </Flex>

          <TopbarActions
            dark={dark}
            menuOpen={menuOpen}
            onToggleTheme={onToggleTheme}
            onToggleMenu={() => {
              setOpenAt(menuOpen ? null : pathname);
            }}
          />
        </Flex>
      </Container>
    </Box>
  );
}
