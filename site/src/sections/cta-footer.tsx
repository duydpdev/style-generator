import { VERSION } from "../data/version";
import { Box, Flex, Grid, Stack } from "../ui";

/**
 *
 */
export function CtaFooter() {
  return (
    <>
      <Grid
        data-part="cta-card"
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
        <Flex data-part="cta-row" wrap gap={2.5} position="relative">
          <Flex
            as="a"
            data-part="btn btn-primary btn-lg"
            align="center"
            gap={1.5}
            px={5}
            py={3}
            href="https://github.com/duydpdev/style-generator/pkgs/npm/style-generator"
            target="_blank"
            rel="noopener noreferrer"
          >
            Install from GitHub Packages ↗
          </Flex>
          <Flex
            as="a"
            data-part="btn btn-outline btn-lg"
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
        data-part="footer-inner"
        justify="between"
        wrap
        align="end"
        gap={6}
        py={14}
        mt={16}
      >
        <Box>
          <Flex data-part="brand" align="center" gap={3}>
            <Box data-part="brand-mark" />
            <Stack data-part="brand-meta">
              <b>@duydpdev/style-generator</b>
              <Box as="span">v{VERSION} · MIT · 2026</Box>
            </Stack>
          </Flex>
          <Box as="p" mt={3}>
            A TypeScript library and CLI for generating Tailwind design systems
            from a single JSON file.
          </Box>
        </Box>
        <Flex data-part="footer-meta" wrap gap={4}>
          <a
            href="https://github.com/duydpdev/style-generator/pkgs/npm/style-generator"
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
