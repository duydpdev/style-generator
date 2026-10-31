import type { MouseEvent, RefObject } from "react";

import { jumpToHeading, useDocHeadings } from "../lib/use-doc-headings";
import { Box, Flex, Stack } from "../ui";

interface Props {
  contentRef: RefObject<HTMLElement | null>;
  rawMarkdown: string;
}

/** "On this page" list for <=860px, where the right rail is hidden. */
export function DocsMobileOnPage({ contentRef, rawMarkdown }: Readonly<Props>) {
  const headings = useDocHeadings(contentRef, rawMarkdown);
  if (headings.length === 0) return null;

  return (
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
        <Box as="span">On this page</Box>
        <Box as="span" data-part="cur" minWidth={0}>
          {headings.length} sections
        </Box>
      </Flex>
      <Stack
        as="ol"
        data-part="docs-mobile-onpage"
        gap={0.25}
        px={2.5}
        pb={3}
        maxHeight="60vh"
      >
        {headings.map((h) => (
          <li key={h.id}>
            <Box
              as="button"
              type="button"
              width="100%"
              minHeight={36}
              rounded="md"
              py={2}
              pl={h.level === 3 ? 6 : 2.5}
              pr={2.5}
              onClick={(e: MouseEvent<HTMLElement>) => {
                // Close first: the list sits above the content and shifts it.
                e.currentTarget.closest("details")?.removeAttribute("open");
                jumpToHeading(h.id);
              }}
            >
              {h.text}
            </Box>
          </li>
        ))}
      </Stack>
    </Box>
  );
}
