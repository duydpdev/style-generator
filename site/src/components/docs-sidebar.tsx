import { type ReactNode, useRef } from "react";

import { VERSION } from "../data/version";
import { docsOf } from "../lib/docs-content";
import { UI_TEXT } from "../lib/locale";
import { useLocale } from "../lib/use-locale";
import { useScrollActiveIntoView } from "../lib/use-scroll-active";
import { Box, Flex, Stack } from "../ui";

import { DocsNavGroups } from "./docs-nav-list";

interface Props {
  activeSlug?: string;
}

function FootRow({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Flex justify="between" gap={2}>
      <Box as="span">{label}</Box>
      {children}
    </Flex>
  );
}

export function DocsSidebar({ activeSlug }: Readonly<Props>) {
  const locale = useLocale();
  const t = UI_TEXT[locale];
  const navRef = useRef<HTMLDivElement>(null);
  useScrollActiveIntoView(navRef, activeSlug);

  return (
    <Box as="aside" data-part="docs-rail" position="relative" pt={9}>
      <Stack
        data-part="docs-rail-sticky"
        gap={0}
        pr={1.5}
        maxHeight="calc(100vh - 100px)"
      >
        <Flex data-part="rail-label" align="center" gap={2.5} mb={1}>
          {t.documentation}
        </Flex>
        <Box data-part="docs-rail-nav" ref={navRef}>
          <DocsNavGroups activeSlug={activeSlug} />
        </Box>

        <Stack data-part="rail-foot" mt={7.5} pt={3.5} gap={2}>
          <FootRow label={t.versionLabel}>
            <Box as="span">v{VERSION}</Box>
          </FootRow>
          <FootRow label={t.licenseLabel}>
            <Box as="span">MIT</Box>
          </FootRow>
          <FootRow label={t.sourceLabel}>
            <a
              href="https://github.com/duydpdev/style-generator"
              target="_blank"
              rel="noopener noreferrer"
            >
              github ↗
            </a>
          </FootRow>
          <FootRow label={t.docsLabel}>
            <Box as="span">{t.pages(docsOf(locale).length)}</Box>
          </FootRow>
        </Stack>
      </Stack>
    </Box>
  );
}
