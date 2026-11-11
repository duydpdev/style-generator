import { VERSION } from "../data/version";
import { Box, Flex, Grid, Stack, Text } from "../ui";

/**
 *
 */
export function CtaFooter() {
  return (
    <>
      <Grid
        className="s-cta-card"
        align="end"
        gap={8}
        mt={14}
        p={12}
        position="relative"
      >
        <Box>
          <Box as="h3" mb={3}>
            Stop maintaining the plumbing.
            <br />
            Start shipping the design.
          </Box>
          <Box as="p">
            One install, one JSON file, one pipeline. Tailwind v4. MIT licensed.
          </Box>
        </Box>
        <Flex className="s-cta-row" wrap gap={2.5} position="relative">
          <Flex
            as="a"
            className="s-btn s-btn-primary s-btn-lg"
            align="center"
            gap={1.5}
            px={5}
            py={3}
            href="https://www.npmjs.com/package/@duydpdev/style-generator"
            target="_blank"
            rel="noopener noreferrer"
          >
            Install from npm ↗
          </Flex>
          <Flex
            as="a"
            className="s-btn s-btn-outline s-btn-lg"
            align="center"
            gap={1.5}
            px={5}
            py={3}
            href="https://github.com/duydpdev/style-generator"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </Flex>
        </Flex>
      </Grid>

      <Flex
        className="s-footer-inner"
        justify="between"
        wrap
        align="end"
        gap={6}
        py={14}
        mt={16}
      >
        <Box>
          <Flex className="s-brand" align="center" gap={3}>
            <Box
              className="s-brand-mark"
              position="relative"
              width={26}
              height={26}
            />
            <Stack className="s-brand-meta">
              <b>@duydpdev/style-generator</b>
              <Text as="span" color="muted">
                v{VERSION} · MIT · 2026
              </Text>
            </Stack>
          </Flex>
          <Box as="p" mt={3}>
            A TypeScript library and CLI for generating Tailwind design systems
            from a single JSON file.
          </Box>
        </Box>
        <Flex className="s-footer-meta" wrap gap={4}>
          <a
            href="https://www.npmjs.com/package/@duydpdev/style-generator"
            target="_blank"
            rel="noopener noreferrer"
          >
            package ↗
          </a>
          <a
            href="https://github.com/duydpdev/style-generator"
            target="_blank"
            rel="noopener noreferrer"
          >
            github ↗
          </a>
        </Flex>
      </Flex>
    </>
  );
}
