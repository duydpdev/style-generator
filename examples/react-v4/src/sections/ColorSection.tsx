import { Box } from "../components/Box";
import { Text } from "../components/Text";
import { Box as UiBox } from "../ui";

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
    <section
      className="border-t py-14"
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

      <Box className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {COLOR_ROWS.map(({ key, label, desc }) => {
          const hex = set[key];
          return (
            <Box
              key={key}
              backgroundColor="surface"
              rounded="lg"
              className="sg-color-card sg-glass-target overflow-hidden border"
              style={{ borderColor: "var(--c-line)" }}
            >
              <div
                className="relative h-24"
                style={{ background: `var(--color-${key})` }}
              >
                <UiBox className="sg-tone-strip">
                  <span style={{ background: hex, opacity: 0.55 }} />
                  <span style={{ background: hex, opacity: 0.75 }} />
                  <span style={{ background: hex }} />
                </UiBox>
              </div>
              <Box px={4} py={3} gap={1} className="flex flex-col">
                <Text type="text14Regular" className="font-medium">
                  {label}
                </Text>
                <Text type="text12Mono" color="muted">
                  --color-{key}
                </Text>
                <Text type="text12Mono" color="muted">
                  {desc} · {hex.toUpperCase()}
                </Text>
              </Box>
            </Box>
          );
        })}
      </Box>
    </section>
  );
};
