import type { RefObject } from "react";

import {
  jumpToHeading,
  useDocHeadings,
  useDocScroll,
} from "../lib/use-doc-headings";
import { Box, Flex, Stack } from "../ui";

interface Props {
  contentRef: RefObject<HTMLElement | null>;
  rawMarkdown: string;
  quicklinks?: { label: string; href: string; arr?: string }[];
}

export function DocsOnPage({
  contentRef,
  rawMarkdown,
  quicklinks = [],
}: Readonly<Props>) {
  const headings = useDocHeadings(contentRef, rawMarkdown);
  const { activeId, progress } = useDocScroll(contentRef, headings);

  return (
    <Box as="aside" data-part="toc-rail" position="relative" pt={9}>
      <Stack
        data-part="toc-rail-sticky"
        gap={3.5}
        pl={1.5}
        maxHeight="calc(100vh - 100px)"
      >
        <Flex data-part="toc-rail-label" align="center" gap={2.5}>
          On this page
        </Flex>
        <Stack as="ol" data-part="onpage" gap={0.25} position="relative">
          {headings.map((h) => {
            const active = h.id === activeId;
            return (
              <li
                key={h.id}
                data-part={
                  [h.level === 3 && "h3", active && "active"]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
              >
                <Box
                  as="button"
                  type="button"
                  width="100%"
                  pl={h.level === 3 ? 6.5 : 3.5}
                  py={1.25}
                  aria-current={active ? "location" : undefined}
                  onClick={() => {
                    jumpToHeading(h.id);
                  }}
                >
                  {h.text}
                </Box>
              </li>
            );
          })}
        </Stack>

        <Flex
          data-part="toc-rail-progress"
          align="center"
          justify="between"
          mt={1.5}
        >
          <Box as="span">READ</Box>
          <Box
            as="span"
            data-part="toc-progress-track"
            height={2}
            mx={2.5}
            backgroundColor="line"
          >
            <Box
              as="span"
              data-part="toc-progress-fill"
              height="100%"
              backgroundColor="primary"
              style={{ transform: `scaleX(${String(progress)})` }}
            />
          </Box>
          <Box as="span">{Math.round(progress * 100)}%</Box>
        </Flex>

        {quicklinks.length > 0 ? (
          <Stack data-part="toc-quicklinks" gap={1} pt={3.5}>
            {quicklinks.map((q) => {
              const external = q.href.startsWith("http");
              return (
                <Flex
                  as="a"
                  key={q.href}
                  href={q.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  align="center"
                  justify="between"
                  gap={2}
                  py={1}
                >
                  <Box as="span">{q.label}</Box>
                  <Box as="span" data-part="arr">
                    {q.arr ?? "↗"}
                  </Box>
                </Flex>
              );
            })}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
