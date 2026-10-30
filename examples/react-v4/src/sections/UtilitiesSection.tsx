import { Box, Flex, Grid, Text } from "../ui";

import { SectionHead } from "./SectionHead";

const SPACING = [
  { name: "p={2}", px: 8 },
  { name: "p={4}", px: 16 },
  { name: "p={6}", px: 24 },
  { name: "p={8}", px: 32 },
  { name: "p={12}", px: 48 },
];

const SHADOWS: { key: "sm" | "md" | "lg" }[] = [
  { key: "sm" },
  { key: "md" },
  { key: "lg" },
];

const RADII: { key: "sm" | "md" | "lg" | "pill"; width: number }[] = [
  { key: "sm", width: 80 },
  { key: "md", width: 80 },
  { key: "lg", width: 80 },
  { key: "pill", width: 130 },
];

const UtilTitle = ({ children }: { children: string }) => (
  <Text type="text12Mono" color="muted" mb={5} data-part="caps-wide">
    {children}
  </Text>
);

export const UtilitiesSection = () => {
  return (
    <Box
      as="section"
      borderT="thin"
      py={14}
      style={{ borderColor: "var(--c-line)" }}
    >
      <SectionHead
        num="03 — Spacing, radius & shadow"
        title="A measured cadence."
        desc={
          <>
            Padding compiles to inline <code>--sg-sp-*</code> variables — zero
            safelist. Radii and shadows stay tokenized so a single palette swap
            reshapes the entire surface treatment.
          </>
        }
      />

      <Box mb={12}>
        <UtilTitle>Padding scale</UtilTitle>
        {SPACING.map(({ name, px }) => (
          <Grid
            key={name}
            align="center"
            gap={4}
            borderT="thin"
            py={3}
            data-part="dashed padding-row"
            style={{ borderColor: "var(--c-line)" }}
          >
            <Text type="text12Mono" color="muted">
              {name}
            </Text>
            <Box>
              <Box
                data-part="sg-spacing-bar"
                style={{ width: `${String((px / 48) * 100)}%` }}
              />
            </Box>
            <Text type="text12Mono" align="right">
              {px}px
            </Text>
          </Grid>
        ))}
      </Box>

      <Grid columns={{ base: 1, md: 2 }} gap={{ base: 8, md: 12 }}>
        <Box>
          <UtilTitle>Radius</UtilTitle>
          <Flex wrap align="end" gap={4}>
            {RADII.map(({ key, width }) => (
              <Flex
                key={key}
                align="end"
                justify="center"
                pb={2}
                style={{
                  width,
                  height: 80,
                  background: "var(--c-primary-soft)",
                  border: `1px dashed color-mix(in srgb, var(--color-primary) 40%, transparent)`,
                  borderRadius: `var(--radius-${key})`,
                }}
              >
                <Text
                  type="text12Mono"
                  style={{ color: "var(--color-primary)" }}
                >
                  {key}
                </Text>
              </Flex>
            ))}
          </Flex>
        </Box>
        <Box>
          <UtilTitle>Shadow</UtilTitle>
          <Flex gap={4}>
            {SHADOWS.map(({ key }) => (
              <Flex
                key={key}
                backgroundColor="surface"
                rounded="md"
                shadow={key}
                border="thin"
                height={100}
                align="end"
                justify="center"
                pb={3}
                data-part="sg-glass-target grow-1"
                style={{ borderColor: "var(--c-line)" }}
              >
                <Text type="text12Mono" color="muted">
                  {key}
                </Text>
              </Flex>
            ))}
          </Flex>
        </Box>
      </Grid>
    </Box>
  );
};
