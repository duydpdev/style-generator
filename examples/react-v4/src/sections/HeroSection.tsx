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
      <Box as="span" mb={7} className="x-sg-eyebrow">
        A token-driven design system
      </Box>
      <Box
        as="h1"
        mb={7}
        className="x-sg-font-display x-sg-hero-title x-hero-title"
      >
        Tokens, <em>composed</em> with intention.
      </Box>
      <Text color="muted" mb={10} className="x-hero-lede">
        A small, opinionated set of design primitives —{" "}
        <b className="x-fg x-text-medium">
          colors, type, spacing, radii, shadows
        </b>{" "}
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
              className="x-sg-palette-pick"
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
                    className="x-sg-palette-dot x-dot-ring"
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
