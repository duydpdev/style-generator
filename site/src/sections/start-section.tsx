import { ChapterHead } from "../components/chapter-head";
import { Box, Grid, Stack } from "../ui";
import { KeyPoint } from "../components/key-point";
import {
  TerminalTypewriter,
  type TermLine,
} from "../components/terminal-typewriter";

const TERM_LINES: TermLine[] = [
  {
    html: '<span class="prompt">$</span> <span class="acc">yarn style-gen init</span>',
    delay: 250,
  },
  { html: '<span class="dim">┌  style-gen init</span>', delay: 250 },
  { html: '<span class="dim">│</span>', delay: 50 },
  {
    html: '<span class="dim">◇</span>  Theme file location?  <span class="acc">src/styles/theme.json</span>',
    delay: 380,
  },
  {
    html: '<span class="dim">◇</span>  Generator script location?  <span class="acc">src/plugins/theme-plugin.ts</span>',
    delay: 380,
  },
  {
    html: '<span class="dim">◇</span>  Include dark mode template?  <span class="acc">yes</span>',
    delay: 380,
  },
  { html: '<span class="dim">│</span>', delay: 50 },
  {
    html: '<span class="good">✓</span>  wrote <span class="acc">theme.json</span> + <span class="acc">theme.schema.json</span>',
    delay: 220,
  },
  {
    html: '<span class="good">✓</span>  wrote <span class="acc">theme-plugin.ts</span>',
    delay: 220,
  },
  {
    html: '<span class="good">✓</span>  wrote <span class="acc">style-gen.config.json</span>',
    delay: 280,
  },
  { html: '<span class="dim">│</span>', delay: 50 },
  {
    html: '<span class="dim">└</span>  <span class="good">You\'re all set!</span> · <span class="dim">run <span class="acc">style-gen generate</span></span>',
    delay: 350,
  },
  {
    html: '<span class="prompt">$</span> <span class="cursor" data-testid="terminal-cursor"></span>',
    delay: 0,
  },
];

/**
 *
 */
export function StartSection() {
  return (
    <Box
      as="section"
      id="start"
      data-ch="09"
      data-ch-label="Get started"
      pt={14}
      pb={2}
      mt={6}
    >
      <ChapterHead
        num="09"
        label="Three commands"
        title={
          <>
            Scaffold. <em>Watch.</em> Validate.
          </>
        }
        lede={
          <>
            The <code>style-gen</code> CLI ships with every install. Interactive
            prompts on first run, flag-driven for CI.
          </>
        }
      />

      <Grid data-part="split-grid" data-reveal="up" gap={6}>
        <Stack gap={3}>
          <KeyPoint
            badge="01"
            title={<code>yarn style-gen init</code>}
            body={
              <>
                Interactive wizard. Theme and script paths, optional dark
                template — writes the theme, its JSON Schema and the config.
              </>
            }
          />
          <KeyPoint
            badge="02"
            title={<code>style-gen generate --watch</code>}
            body={
              <>
                Regenerates theme.css on every save. Pair with the Vite plugin.
              </>
            }
          />
          <KeyPoint
            badge="03"
            title={<code>style-gen doctor</code>}
            body={<>Validates schema, checks wiring, warns on legacy shapes.</>}
          />
        </Stack>
        <TerminalTypewriter lines={TERM_LINES} />
      </Grid>
    </Box>
  );
}
