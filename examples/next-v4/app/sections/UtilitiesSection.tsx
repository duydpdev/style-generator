import { Box } from "../components/Box";
import { Text } from "../components/Text";

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
  <Text
    type="text12Mono"
    color="muted"
    className="mb-5 block uppercase tracking-wider"
  >
    {children}
  </Text>
);

export const UtilitiesSection = () => {
  return (
    <section
      className="border-t py-14"
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

      <Box className="mb-12">
        <UtilTitle>Padding scale</UtilTitle>
        {SPACING.map(({ name, px }) => (
          <Box
            key={name}
            className="grid grid-cols-[80px_1fr_80px] items-center gap-4 border-t border-dashed py-3 first:border-t-0"
            style={{ borderColor: "var(--c-line)" }}
          >
            <Text type="text12Mono" color="muted">
              {name}
            </Text>
            <div>
              <div
                className="sg-spacing-bar"
                style={{ width: `${String((px / 48) * 100)}%` }}
              />
            </div>
            <Text type="text12Mono" className="text-right">
              {px}px
            </Text>
          </Box>
        ))}
      </Box>

      <Box className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        <Box>
          <UtilTitle>Radius</UtilTitle>
          <Box gap={4} className="flex flex-wrap items-end">
            {RADII.map(({ key, width }) => (
              <Box
                key={key}
                className="flex items-end justify-center pb-2"
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
              </Box>
            ))}
          </Box>
        </Box>
        <Box>
          <UtilTitle>Shadow</UtilTitle>
          <Box gap={4} className="flex">
            {SHADOWS.map(({ key }) => (
              <Box
                key={key}
                backgroundColor="surface"
                rounded="md"
                shadow={key}
                className="sg-glass-target flex h-[100px] flex-1 items-end justify-center border pb-3"
                style={{ borderColor: "var(--c-line)" }}
              >
                <Text type="text12Mono" color="muted">
                  {key}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </section>
  );
};
