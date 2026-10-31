import type { Chapter } from "../lib/chapters";
import { Box, Flex, Grid, Stack, Text } from "../ui";

interface Props {
  chapters: Chapter[];
  activeIndex: number;
  onJump: (id: string) => void;
}

/**
 *
 * @param root0
 * @param root0.chapters
 * @param root0.activeIndex
 * @param root0.onJump
 */
export function SidebarToc({ chapters, activeIndex, onJump }: Readonly<Props>) {
  return (
    <Box as="aside" data-part="toc-aside" position="relative">
      <Stack data-part="toc-sticky" position="sticky" gap={5.5}>
        <Flex data-part="toc-label" align="center" gap={2.5}>
          Table of contents
        </Flex>
        <Stack as="ol" data-part="toc" position="relative" gap={0.5}>
          {chapters.map((ch, i) => (
            <li key={ch.id} data-part="contents">
              <Grid
                as="button"
                type="button"
                data-part={`toc-item${i === activeIndex ? " active" : ""}`}
                position="relative"
                width="100%"
                gap={2.5}
                py={1.5}
                onClick={() => {
                  onJump(ch.id);
                }}
              >
                <Text as="span" data-part="num" color="muted" pl={2}>
                  {ch.num}
                </Text>
                <Box as="span" data-part="ttl">
                  {ch.label}
                </Box>
              </Grid>
            </li>
          ))}
        </Stack>
        <Stack data-part="toc-foot" mt={2} gap={2}>
          <Flex justify="between" gap={2}>
            <Text as="span">License</Text>
            <Text as="span">MIT</Text>
          </Flex>
          <Flex justify="between" gap={2}>
            <Text as="span">Author</Text>
            <a
              href="https://duydp.dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              duydp ↗
            </a>
          </Flex>
          <Flex justify="between" gap={2}>
            <Text as="span">Source</Text>
            <a
              href="https://github.com/duydpdev/style-generator"
              target="_blank"
              rel="noopener noreferrer"
            >
              github ↗
            </a>
          </Flex>
        </Stack>
      </Stack>
    </Box>
  );
}
