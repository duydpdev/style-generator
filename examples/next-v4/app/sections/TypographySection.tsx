import { Box } from "../components/Box";
import { Text } from "../components/Text";

import { SectionHead } from "./SectionHead";

interface TypoRow {
  label: string;
  spec: string;
  className: string;
  body: string;
}

const ROWS: TypoRow[] = [
  {
    label: "Display · Serif",
    spec: "Instrument Serif · 80/100% · -0.025em",
    className:
      "sg-font-display text-[clamp(40px,6vw,80px)] tracking-[-0.025em] leading-none",
    body: "The quick brown fox.",
  },
  {
    label: "Heading · text32Bold",
    spec: "Geist 700 · 32/120% · -0.02em",
    className: "text-[32px] font-bold tracking-[-0.02em] leading-tight",
    body: "Tokens drive every component on the page.",
  },
  {
    label: "Body · text16Medium",
    spec: "Geist 500 · 16/150% · 0em",
    className: "text-[16px] font-medium leading-relaxed",
    body: "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. Sphinx of black quartz, judge my vow.",
  },
  {
    label: "Mono · code",
    spec: "JetBrains Mono 400 · 13px",
    className: "sg-font-mono text-[13px]",
    body: 'const tokens = require("./theme.json");',
  },
];

export const TypographySection = () => {
  return (
    <section
      className="border-t py-14"
      style={{ borderColor: "var(--c-line)" }}
    >
      <SectionHead
        num="02 — Typography"
        title="Two voices, one rhythm."
        desc={
          <>
            <b style={{ color: "var(--color-foreground)" }}>Instrument Serif</b>{" "}
            handles display and editorial accents;{" "}
            <b style={{ color: "var(--color-foreground)" }}>Geist</b> carries
            every body and UI surface;{" "}
            <b style={{ color: "var(--color-foreground)" }}>JetBrains Mono</b>{" "}
            stamps the code.
          </>
        }
      />

      <Box className="grid grid-cols-1 items-baseline gap-y-8 md:grid-cols-[220px_1fr] md:gap-x-12">
        {ROWS.map((row) => (
          <Box key={row.label} className="contents">
            <Box gap={1} className="flex flex-col">
              <Text type="text12Mono" color="muted" className="uppercase">
                {row.label}
              </Text>
              <Text type="text12Mono">{row.spec}</Text>
            </Box>
            <div
              className={row.className}
              style={
                row.label === "Mono · code"
                  ? { color: "var(--color-muted)" }
                  : { color: "var(--color-foreground)" }
              }
            >
              {row.body}
            </div>
          </Box>
        ))}
      </Box>
    </section>
  );
};
