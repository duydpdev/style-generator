import { Box } from "../components/Box";
import { Text } from "../components/Text";

import { PALETTE_LIST } from "./palettes";
import type { PaletteId } from "./types";

interface HeroSectionProps {
  palette: PaletteId;
  onPickPalette: (id: PaletteId) => void;
}

export const HeroSection = ({ palette, onPickPalette }: HeroSectionProps) => {
  return (
    <section className="pt-22 pb-14">
      <span className="sg-eyebrow mb-7 block">
        A token-driven design system
      </span>
      <h1
        className="sg-font-display sg-hero-title m-0 mb-7 max-w-[14ch] tracking-[-0.025em] text-[clamp(56px,8vw,104px)] leading-[0.94]"
        style={{ color: "var(--color-foreground)" }}
      >
        Tokens, <em>composed</em> with intention.
      </h1>
      <Text
        className="mb-10 max-w-[56ch] text-[18px] leading-[1.55]"
        color="muted"
      >
        A small, opinionated set of design primitives —{" "}
        <b style={{ color: "var(--color-foreground)", fontWeight: 500 }}>
          colors, type, spacing, radii, shadows
        </b>{" "}
        — that compile down to Tailwind utilities and inline CSS variables. Pick
        a palette below to remix every component on this page in real time.
      </Text>
      <Box gap={2} className="flex flex-wrap">
        {PALETTE_LIST.map((p) => {
          const active = palette === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className="sg-palette-pick"
              aria-pressed={active}
              onClick={() => {
                onPickPalette(p.id);
              }}
            >
              <span className="flex">
                {p.dots.map((c) => (
                  <span
                    key={c}
                    className="sg-palette-dot"
                    style={{ background: c }}
                  />
                ))}
              </span>
              {p.label}
            </button>
          );
        })}
      </Box>
    </section>
  );
};
