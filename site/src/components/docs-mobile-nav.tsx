import type { ReactNode } from "react";

import { docsOf } from "../lib/docs-content";
import { UI_TEXT } from "../lib/locale";
import { useLocale } from "../lib/use-locale";
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
  const locale = useLocale();
  const t = UI_TEXT[locale];
  const current = docsOf(locale).find((d) => d.slug === activeSlug);

  return (
    <Stack
      as="nav"
      className="s-docs-mobile-nav"
      aria-label={t.docs}
      gap={2.5}
      mb={6}
    >
      <Box as="details" className="s-docs-mobile-details" rounded="lg">
        <Flex
          as="summary"
          align="center"
          justify="between"
          gap={3}
          px={4}
          py={2.5}
          minHeight={44}
        >
          <Box as="span">{t.docs}</Box>
          <Box as="span" className="s-cur" minWidth={0}>
            {current?.title ?? t.allPages}
          </Box>
        </Flex>
        <Box className="s-docs-mobile-pages" px={2.5} pb={3} maxHeight="60vh">
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
