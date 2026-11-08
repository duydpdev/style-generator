import { Box, Flex, Grid, Stack, Text } from "../ui";

import { SectionHead } from "./SectionHead";

const ResponsiveTitle = ({ children }: { children: string }) => (
  <Text type="text12Mono" color="muted" mb={3} className="x-caps-wide">
    {children}
  </Text>
);

const Caption = ({ children }: { children: string }) => (
  <Text type="text12Mono" color="muted" mt={2}>
    {children}
  </Text>
);

export const ResponsiveSpacingSection = () => {
  return (
    <Box as="section" borderT="thin" py={14} borderColor="line">
      <SectionHead
        num="05 — Responsive"
        title="Spacing reacts to breakpoints."
        desc="Pass a ResponsiveValueStrict object to spacing props. Each breakpoint key sets a CSS custom property; the generated .sp-* utility resolves the right value at each viewport through an @media fallback chain."
      />

      <Stack gap={8}>
        <Box>
          <ResponsiveTitle>{`p={{ base: 4, md: 8, lg: 12 }}`}</ResponsiveTitle>
          <Box
            border="thin"
            rounded="md"
            backgroundColor="surface"
            p={{ base: 4, md: 8, lg: 12 }}
            borderColor="line"
          >
            <Box
              rounded="sm"
              px={3}
              py={2}
              width="fit-content"
              className="x-tint-primary"
            >
              <Text type="text14Regular" color="primary">
                Padding scales with viewport
              </Text>
            </Box>
          </Box>
          <Caption>
            Resize browser: 4 → 8 → 12 at md (768px) and lg (1024px).
          </Caption>
        </Box>

        <Box>
          <ResponsiveTitle>{`gap={{ base: 2, md: 6 }}`}</ResponsiveTitle>
          <Flex
            wrap
            border="thin"
            rounded="md"
            backgroundColor="surface"
            p={4}
            gap={{ base: 2, md: 6 }}
            borderColor="line"
          >
            {[1, 2, 3, 4].map((i) => (
              <Box
                key={i}
                rounded="sm"
                px={3}
                py={2}
                className="x-tint-secondary"
              >
                <Text type="text14Regular" color="secondary">
                  Item {i}
                </Text>
              </Box>
            ))}
          </Flex>
          <Caption>Flex gap widens from 2 to 6 at md breakpoint.</Caption>
        </Box>

        <Box>
          <ResponsiveTitle>{`gapX={{ base: 2, md: 6 }}`}</ResponsiveTitle>
          <Grid
            columns={3}
            border="thin"
            rounded="md"
            backgroundColor="surface"
            p={4}
            gapX={{ base: 2, md: 6 }}
            gapY={2}
            borderColor="line"
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Box
                key={i}
                rounded="sm"
                px={3}
                py={2}
                className="x-tint-success"
              >
                <Text type="text14Regular" color="success">
                  Cell {i}
                </Text>
              </Box>
            ))}
          </Grid>
          <Caption>Column gap responsive, row gap stays fixed at 2.</Caption>
        </Box>
      </Stack>
    </Box>
  );
};
