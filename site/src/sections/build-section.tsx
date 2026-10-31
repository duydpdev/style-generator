import { ChapterHead } from "../components/chapter-head";
import { Box, Grid, Stack, Text } from "../ui";
import { CodeCard } from "../components/code-card";
import { ArrowRight } from "../components/icon";
import { THEME_CSS, THEME_JSON } from "../data/build-sample";

/**
 *
 */
export function BuildSection() {
  return (
    <Box
      as="section"
      id="build"
      data-ch="03"
      data-ch-label="Input → Output"
      pt={14}
      pb={2}
      mt={6}
    >
      <ChapterHead
        num="03"
        label="From input to output"
        title={
          <>
            JSON in. <em>Tailwind out.</em>
          </>
        }
        lede={
          <>
            Every artifact downstream — CSS variables, dark theme overrides,
            typography and spacing utilities, <code>@source inline</code>{" "}
            coverage, typed tokens — is regenerated whenever{" "}
            <code>theme.json</code> changes.
          </>
        }
      />

      <Grid
        data-part="build-grid"
        data-reveal="up"
        align="start"
        gap={{ base: 3, md: 4 }}
      >
        <CodeCard
          filename="theme.json"
          tag="source"
          lang="json"
          code={THEME_JSON}
        />
        <Stack data-part="arrow-step" align="center" gap={1.5}>
          <Box data-part="arrow-anim" width={28} height={28}>
            <ArrowRight />
          </Box>
          <Text as="span" data-part="lbl">
            compile
          </Text>
        </Stack>
        <CodeCard
          filename="theme.css"
          tag="generated"
          lang="css"
          code={THEME_CSS}
        />
      </Grid>
    </Box>
  );
}
