import { ChapterHead } from "../components/chapter-head";
import { ThemePreview } from "../components/theme-preview";
import { Box, Grid } from "../ui";

const LIGHT_SWATCHES = [
  { color: "#2647D9", label: "--color-primary" },
  {
    color: "#FAF7F2",
    label: "--color-background",
    border: "1px solid #0F153022",
  },
  { color: "#0F1530", label: "--color-foreground" },
];

const DARK_SWATCHES = [
  { color: "#8FA6FF", label: "--color-primary" },
  {
    color: "#0B0E1D",
    label: "--color-background",
    border: "1px solid #ffffff33",
  },
  { color: "#F2EFE9", label: "--color-foreground" },
];

/**
 *
 */
export function ThemingSection() {
  return (
    <Box
      as="section"
      id="theming"
      data-ch="06"
      data-ch-label="Theming"
      pt={14}
      pb={2}
      mt={6}
    >
      <ChapterHead
        num="06"
        label="Theming"
        title={
          <>
            Dark mode, <em>in JSON.</em>
          </>
        }
        lede={
          <>
            Add a <code>themeAxes.theme.dark</code> block to your config.{" "}
            <code>html[data-theme="dark"]</code> overrides — including shadows —
            generate automatically. Switch by toggling one attribute on{" "}
            <code>&lt;html&gt;</code>.
          </>
        }
      />

      <Grid data-part="theme-grid" data-reveal="up" gap={4}>
        <ThemePreview
          variant="light"
          tag='html[data-theme="light"]'
          folio="A · default"
          title="Same markup. Same component."
          swatches={LIGHT_SWATCHES}
          marker="→ vars resolve to JSON top-level"
        />
        <ThemePreview
          variant="dark"
          tag='html[data-theme="dark"]'
          folio="B · override"
          title={
            <>
              Different surface. <em>Zero hand-wired CSS.</em>
            </>
          }
          swatches={DARK_SWATCHES}
          marker="→ vars resolve to themeAxes.theme.dark in JSON"
        />
      </Grid>
    </Box>
  );
}
