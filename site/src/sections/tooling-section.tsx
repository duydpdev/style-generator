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
        safelistColors: true,
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
    <section
      id="tooling"
      className="chapter"
      data-ch="08"
      data-ch-label="Vite plugin"
    >
      <div className="ch-marker">08</div>
      <div className="ch-eyebrow">
        <span>
          Ch. <b>08</b>
        </span>
        <span>· Tooling</span>
      </div>
      <h2 className="ch-title">
        Vite plugin <em>+</em> CLI.
      </h2>
      <p className="ch-lede">
        No prebuild scripts. No manual regen. Drop the plugin into{" "}
        <code>vite.config.ts</code> and the CLI scaffolds the rest.
      </p>

      <div className="split-grid reveal">
        <div className="kp-list">
          <KeyPoint
            badge="V1"
            title={<code>{"styleGenVite({ themePath, outDir })"}</code>}
            body={
              <>
                Emits <code>theme.css</code> + <code>safelist.txt</code> on
                every JSON save. HMR-friendly.
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
                Interactive scaffold — version, paths, optional dark template.
              </>
            }
          />
          <KeyPoint
            badge="C2"
            title={<code>style-gen doctor</code>}
            body={
              <>Validates schema, checks wiring, warns on legacy v1 configs.</>
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
    </section>
  );
}
