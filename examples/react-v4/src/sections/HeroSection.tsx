import { Box, Flex, Text } from "../ui";

import { PALETTE_LIST } from "./palettes";
import type { PaletteId } from "./types";

interface HeroSectionProps {
  palette: PaletteId;
  onPickPalette: (id: PaletteId) => void;
}

export const HeroSection = ({ palette, onPickPalette }: HeroSectionProps) => {
  return (
    <Box as="section" pt={22} pb={14}>
      <Box as="span" mb={7} data-part="sg-eyebrow">
        A token-driven design system
      </Box>
      <Box as="h1" mb={7} data-part="sg-font-display sg-hero-title hero-title">
        Tokens, <em>composed</em> with intention.
      </Box>
      <Text color="muted" mb={10} data-part="hero-lede">
        A small, opinionated set of design primitives —{" "}
        <b data-part="fg text-medium">colors, type, spacing, radii, shadows</b>{" "}
        — that compile down to Tailwind utilities and inline CSS variables. Pick
        a palette below to remix every component on this page in real time.
      </Text>
      <Flex wrap gap={2}>
        {PALETTE_LIST.map((p) => {
          const active = palette === p.id;
          return (
            <Box
              as="button"
              key={p.id}
              type="button"
              data-part="sg-palette-pick"
              aria-pressed={active}
              onClick={() => {
                onPickPalette(p.id);
              }}
            >
              <Flex as="span">
                {p.dots.map((c) => (
                  <Box
                    as="span"
                    key={c}
                    data-part="sg-palette-dot dot-ring"
                    // eslint-disable-next-line no-restricted-syntax -- the dot colour is palette data (a hex per palette), not a theme token
                    style={{ background: c }}
                  />
                ))}
              </Flex>
              {p.label}
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
};
