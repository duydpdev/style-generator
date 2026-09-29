import { KeyPoint } from "../components/key-point";
import {
  TerminalTypewriter,
  type TermLine,
} from "../components/terminal-typewriter";

const TERM_LINES: TermLine[] = [
  {
    html: '<span class="prompt">$</span> <span class="acc">npx style-gen init</span>',
    delay: 250,
  },
  { html: '<span class="dim">┌  @duydpdev/style-generator</span>', delay: 250 },
  { html: '<span class="dim">│</span>', delay: 50 },
  {
    html: '<span class="dim">◇</span>  Tailwind version?  <span class="acc">v4</span>',
    delay: 380,
  },
  {
    html: '<span class="dim">◇</span>  Theme path?  <span class="acc">src/theme/theme.json</span>',
    delay: 380,
  },
  {
    html: '<span class="dim">◇</span>  Plugin path?  <span class="acc">src/theme/plugin.ts</span>',
    delay: 380,
  },
  {
    html: '<span class="dim">◇</span>  Dark template?  <span class="acc">yes</span>',
    delay: 380,
  },
  { html: '<span class="dim">│</span>', delay: 50 },
  {
    html: '<span class="good">✓</span>  wrote <span class="acc">theme.json</span>',
    delay: 220,
  },
  {
    html: '<span class="good">✓</span>  wrote <span class="acc">plugin.ts</span>',
    delay: 220,
  },
  {
    html: '<span class="good">✓</span>  wired <span class="acc">styleGenVite()</span> in vite.config.ts',
    delay: 280,
  },
  { html: '<span class="dim">│</span>', delay: 50 },
  {
    html: '<span class="dim">└</span>  <span class="good">Setup complete</span> · <span class="dim">run <span class="acc">yarn dev</span></span>',
    delay: 350,
  },
  {
    html: '<span class="prompt">$</span> <span class="cursor"></span>',
    delay: 0,
  },
];

/**
 *
 */
export function StartSection() {
  return (
    <section
      id="start"
      className="chapter"
      data-ch="09"
      data-ch-label="Get started"
    >
      <div className="ch-marker">09</div>
      <div className="ch-eyebrow">
        <span>
          Ch. <b>09</b>
        </span>
        <span>· Three commands</span>
      </div>
      <h2 className="ch-title">
        Scaffold. <em>Watch.</em> Validate.
      </h2>
      <p className="ch-lede">
        The <code>style-gen</code> CLI ships with every install. Interactive
        prompts on first run, flag-driven for CI.
      </p>

      <div className="split-grid reveal">
        <div className="kp-list">
          <KeyPoint
            badge="01"
            title={<code>npx style-gen init</code>}
            body={
              <>
                Interactive wizard. Pick v3 or v4, target paths, dark template —
                ~10s.
              </>
            }
          />
          <KeyPoint
            badge="02"
            title={<code>style-gen generate --watch</code>}
            body={
              <>
                Regenerates theme.css on every save. Pair with the Vite
                plugin.
              </>
            }
          />
          <KeyPoint
            badge="03"
            title={<code>style-gen doctor</code>}
            body={<>Validates schema, checks wiring, warns on legacy shapes.</>}
          />
        </div>
        <TerminalTypewriter lines={TERM_LINES} />
      </div>
    </section>
  );
}
