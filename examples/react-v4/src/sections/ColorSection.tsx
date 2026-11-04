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
    <Box as="section" borderT="thin" py={14} borderColor="line">
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
              className="x-sg-color-card x-sg-glass-target x-color-card"
              borderColor="line"
            >
              <Box height={96} backgroundColor={key}>
                <Box className="x-sg-tone-strip">
                  <Box as="span" backgroundColor={key} className="x-tone-55" />
                  <Box as="span" backgroundColor={key} className="x-tone-75" />
                  <Box as="span" backgroundColor={key} />
                </Box>
              </Box>
              <Stack px={4} py={3} gap={1}>
                <Text type="text14Regular" className="x-text-medium">
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
