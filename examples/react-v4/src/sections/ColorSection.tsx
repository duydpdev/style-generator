import { Box, Grid, Stack, Text } from "../ui";

import { COLOR_ROWS, colorsFor } from "./palettes";
import { SectionHead } from "./SectionHead";
import type { PaletteId, ThemeName } from "./types";

interface ColorSectionProps {
  palette: PaletteId;
  theme: ThemeName;
}

export const ColorSection = ({ palette, theme }: ColorSectionProps) => {
  const set = colorsFor(palette, theme);

  return (
    <Box
      as="section"
      borderT="thin"
      py={14}
      style={{ borderColor: "var(--c-line)" }}
    >
      <SectionHead
        num="01 — Color"
        title="A four-role palette."
        desc={
          <>
            Each token resolves at runtime via <code>--color-*</code> custom
            properties. Toggle the theme to flip every swatch to its dark
            counterpart without remounting a single component.
          </>
        }
      />

      <Grid columns={{ base: 2, md: 4 }} gap={4}>
        {COLOR_ROWS.map(({ key, label, desc }) => {
          const hex = set[key];
          return (
            <Box
              key={key}
              backgroundColor="surface"
              rounded="lg"
              border="thin"
              data-part="sg-color-card sg-glass-target color-card"
              style={{ borderColor: "var(--c-line)" }}
            >
              <Box height={96} style={{ background: `var(--color-${key})` }}>
                <Box data-part="sg-tone-strip">
                  <Box as="span" style={{ background: hex, opacity: 0.55 }} />
                  <Box as="span" style={{ background: hex, opacity: 0.75 }} />
                  <Box as="span" style={{ background: hex }} />
                </Box>
              </Box>
              <Stack px={4} py={3} gap={1}>
                <Text type="text14Regular" data-part="text-medium">
                  {label}
                </Text>
                <Text type="text12Mono" color="muted">
                  --color-{key}
                </Text>
                <Text type="text12Mono" color="muted">
                  {desc} · {hex.toUpperCase()}
                </Text>
              </Stack>
            </Box>
          );
        })}
      </Grid>
    </Box>
  );
};
