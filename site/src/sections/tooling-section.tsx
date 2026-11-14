import { ChapterHead } from "../components/chapter-head";
import { Box, Grid, Stack } from "../ui";
import { CodeCard } from "../components/code-card";
import { KeyPoint } from "../components/key-point";

const VITE_CODE = `import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite }
  from "@duydpdev/style-generator/vite";

export default defineConfig({
  plugins: [styleGenVite(), tailwindcss()],
});

// style-gen.config.json
{
  "theme": "src/theme/theme.json",
  "output": "src/theme/theme.css",
  "breakpoints": ["md", "lg"]
}`;

/**
 *
 */
export function ToolingSection() {
  return (
    <Box
      as="section"
      id="tooling"
      data-ch="08"
      data-ch-label="Vite plugin"
      pt={14}
      pb={2}
      mt={6}
    >
      <ChapterHead
        num="08"
        label="Tooling"
        title={
          <>
            Vite plugin <em>+</em> CLI.
          </>
        }
        lede={
          <>
            No prebuild scripts. No manual regen. Drop the plugin into{" "}
            <code>vite.config.ts</code> and the CLI scaffolds the rest.
          </>
        }
      />

      <Grid className="s-split-grid" data-reveal="up" gap={6}>
        <Stack gap={3}>
          <KeyPoint
            badge="V1"
            title={<code>{"styleGenVite()"}</code>}
            body={
              <>
                Reads <code>style-gen.config.json</code>, emits{" "}
                <code>theme.css</code> on every JSON save. HMR-friendly.
              </>
            }
          />
          <KeyPoint
            badge="V2"
            title={
              <>
                Runs <em>before</em> <code>@tailwindcss/vite</code>
              </>
            }
            body={
              <>
                So <code>@source</code> sees fresh files.
              </>
            }
          />
          <KeyPoint
            badge="C1"
            title={<code>style-gen init</code>}
            body={
              <>
                Interactive scaffold — theme path, dark template, printed
                bundler wiring.
              </>
            }
          />
          <KeyPoint
            badge="C2"
            title={<code>style-gen doctor</code>}
            body={
              <>Validates config and schema, warns on utility name clashes.</>
            }
          />
        </Stack>
        <CodeCard
          filename="vite.config.ts"
          tag="plugin"
          lang="ts"
          code={VITE_CODE}
        />
      </Grid>
    </Box>
  );
}
