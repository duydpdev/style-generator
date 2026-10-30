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
      <Box
        as="h1"
        mb={7}
        data-part="sg-font-display sg-hero-title hero-title"
        style={{ color: "var(--color-foreground)" }}
      >
        Tokens, <em>composed</em> with intention.
      </Box>
      <Text color="muted" mb={10} data-part="hero-lede">
        A small, opinionated set of design primitives —{" "}
        <b style={{ color: "var(--color-foreground)", fontWeight: 500 }}>
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
                    data-part="sg-palette-dot"
                    style={{
                      background: c,
                      boxShadow:
                        "0 0 0 1px color-mix(in srgb, var(--color-foreground) 35%, transparent)",
                    }}
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
