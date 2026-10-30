import { ChapterHead } from "../components/chapter-head";
import { Box } from "../ui";
import { CodeCard } from "../components/code-card";
import { KeyPoint } from "../components/key-point";

const VITE_CODE = `import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite }
  from "@duydpdev/style-generator/vite";

export default defineConfig({
  plugins: [
    styleGenVite({
      themePath: "src/theme/theme.json",
      outDir:    "src/theme",
      options: {
        breakpoints: ["md", "lg"],
      },
    }),
    tailwindcss(),
  ],
});`;

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

      <div className="split-grid" data-reveal="up">
        <div className="kp-list">
          <KeyPoint
            badge="V1"
            title={<code>{"styleGenVite({ themePath, outDir })"}</code>}
            body={
              <>
                Emits <code>theme.css</code> on every JSON save. HMR-friendly.
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
            body={<>Interactive scaffold — paths, optional dark template.</>}
          />
          <KeyPoint
            badge="C2"
            title={<code>style-gen doctor</code>}
            body={
              <>Validates config and schema, warns on utility name clashes.</>
            }
          />
        </div>
        <CodeCard
          filename="vite.config.ts"
          tag="plugin"
          lang="ts"
          code={VITE_CODE}
        />
      </div>
    </Box>
  );
}
