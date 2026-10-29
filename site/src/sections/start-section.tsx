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
        </div>
        <TerminalTypewriter lines={TERM_LINES} />
      </div>
    </section>
  );
}
