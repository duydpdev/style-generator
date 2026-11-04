import type { RefObject } from "react";

import { UI_TEXT } from "../lib/locale";
import { useLocale } from "../lib/use-locale";
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
  const t = UI_TEXT[useLocale()];

  return (
    <Box as="aside" className="s-toc-rail" position="relative" pt={9}>
      <Stack
        className="s-toc-rail-sticky"
        gap={3.5}
        pl={1.5}
        maxHeight="calc(100vh - 100px)"
      >
        <Flex className="s-toc-rail-label" align="center" gap={2.5}>
          {t.onThisPage}
        </Flex>
        <Stack as="ol" className="s-onpage" gap={0.25} position="relative">
          {headings.map((h) => {
            const active = h.id === activeId;
            return (
              <li
                key={h.id}
                className={`${h.level === 3 ? "s-h3" : ""}${active ? " s-active" : ""}`}
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
          className="s-toc-rail-progress"
          align="center"
          justify="between"
          mt={1.5}
        >
          <Box as="span">{t.readLabel}</Box>
          <Box
            as="span"
            className="s-toc-progress-track"
            height={2}
            mx={2.5}
            backgroundColor="line"
          >
            <Box
              as="span"
              className="s-toc-progress-fill"
              height="100%"
              backgroundColor="primary"
              // eslint-disable-next-line no-restricted-syntax -- scaleX follows the live reading progress
              style={{ transform: `scaleX(${String(progress)})` }}
            />
          </Box>
          <Box as="span">{Math.round(progress * 100)}%</Box>
        </Flex>

        {quicklinks.length > 0 ? (
          <Stack className="s-toc-quicklinks" gap={1} pt={3.5}>
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
                  <Box as="span" className="s-arr">
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
