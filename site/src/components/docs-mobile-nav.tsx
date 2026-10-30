import type { ReactNode } from "react";

import { docs } from "../lib/docs-content";
import { Box, Flex, Stack } from "../ui";

import { DocsNavGroups } from "./docs-nav-list";

interface Props {
  activeSlug?: string;
  /** Extra disclosure blocks rendered after the page list. */
  children?: ReactNode;
}

/**
 * Docs switcher for <=860px, where the left rail is hidden: a disclosure with
 * the same grouped page list as `DocsSidebar`.
 */
export function DocsMobileNav({ activeSlug, children }: Readonly<Props>) {
  const current = docs.find((d) => d.slug === activeSlug);

  return (
    <Stack
      as="nav"
      data-part="docs-mobile-nav"
      aria-label="Docs"
      gap={2.5}
      mb={6}
    >
      <Box as="details" data-part="docs-mobile-details" rounded="lg">
        <Flex
          as="summary"
          align="center"
          justify="between"
          gap={3}
          px={4}
          py={2.5}
          minHeight={44}
        >
          <Box as="span">Docs</Box>
          <Box as="span" data-part="cur" minWidth={0}>
            {current?.title ?? "All pages"}
          </Box>
        </Flex>
        <Box data-part="docs-mobile-pages" px={2.5} pb={3} maxHeight="60vh">
          <DocsNavGroups
            activeSlug={activeSlug}
            onNavigate={(e) => {
              e.currentTarget.closest("details")?.removeAttribute("open");
            }}
          />
        </Box>
      </Box>
      {children}
    </Stack>
  );
}
