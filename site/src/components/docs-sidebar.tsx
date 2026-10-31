import { type ReactNode, useRef } from "react";

import { VERSION } from "../data/version";
import { docs } from "../lib/docs-content";
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
          Documentation
        </Flex>
        <Box data-part="docs-rail-nav" ref={navRef}>
          <DocsNavGroups activeSlug={activeSlug} />
        </Box>

        <Stack data-part="rail-foot" mt={7.5} pt={3.5} gap={2}>
          <FootRow label="VERSION">
            <Box as="span">v{VERSION}</Box>
          </FootRow>
          <FootRow label="LICENSE">
            <Box as="span">MIT</Box>
          </FootRow>
          <FootRow label="SOURCE">
            <a
              href="https://github.com/duydpdev/style-generator"
              target="_blank"
              rel="noopener noreferrer"
            >
              github ↗
            </a>
          </FootRow>
          <FootRow label="DOCS">
            <Box as="span">{docs.length} pages</Box>
          </FootRow>
        </Stack>
      </Stack>
    </Box>
  );
}
