import { Box, Grid, Stack, Text } from "../ui";

import { SectionHead } from "./SectionHead";

interface TypoRow {
  label: string;
  spec: string;
  part: string;
  body: string;
}

const ROWS: TypoRow[] = [
  {
    label: "Display · Serif",
    spec: "Instrument Serif · 80/100% · -0.025em",
    part: "sg-font-display typo-display",
    body: "The quick brown fox.",
  },
  {
    label: "Heading · text32Bold",
    spec: "Geist 700 · 32/120% · -0.02em",
    part: "typo-heading",
    body: "Tokens drive every component on the page.",
  },
  {
    label: "Body · text16Medium",
    spec: "Geist 500 · 16/150% · 0em",
    part: "typo-body",
    body: "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. Sphinx of black quartz, judge my vow.",
  },
  {
    label: "Mono · code",
    spec: "JetBrains Mono 400 · 13px",
    part: "sg-font-mono typo-mono",
    body: 'const tokens = require("./theme.json");',
  },
];

export const TypographySection = () => {
  return (
    <Box
      as="section"
      borderT="thin"
      py={14}
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

      <Grid
        columns={1}
        gapY={8}
        gapX={{ base: 0, md: 12 }}
        data-part="typo-grid"
      >
        {ROWS.map((row) => (
          <Box key={row.label} data-part="display-contents">
            <Stack gap={1}>
              <Text type="text12Mono" color="muted" data-part="caps">
                {row.label}
              </Text>
              <Text type="text12Mono">{row.spec}</Text>
            </Stack>
            <Box
              data-part={row.part}
              style={
                row.label === "Mono · code"
                  ? { color: "var(--color-muted)" }
                  : { color: "var(--color-foreground)" }
              }
            >
              {row.body}
            </Box>
          </Box>
        ))}
      </Grid>
    </Box>
  );
};
