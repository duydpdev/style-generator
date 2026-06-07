import { CodeCard } from "../components/code-card";
import { ArrowRight } from "../components/icon";

const THEME_JSON = `{
  "colors": {
    "primary": "#2647D9",
    "background": "#FAF7F2",
    "foreground": "#0F1530"
  },
  "typography": {
    "body": { "fontSize": "16px", "fontWeight": 500 }
  },
  "themes": {
    "dark": {
      "colors": {
        "primary": "#8FA6FF",
        "background": "#0B0E1D"
      }
    }
  }
}`;

const THEME_CSS = `/* generated */
:root {
  --sg-primary: #2647D9;
  --sg-background: #FAF7F2;
  --sg-foreground: #0F1530;
}

[data-theme="dark"] {
  --sg-primary: #8FA6FF;
  --sg-background: #0B0E1D;
}

@theme inline {
  --color-primary: var(--sg-primary);
  --color-background: var(--sg-background);
}

/* zero-safelist spacing */
.sp-p { padding: var(--sp-p); }`;

/**
 *
 */
export function BuildSection() {
  return (
    <section
      id="build"
      className="chapter"
      data-ch="03"
      data-ch-label="Input → Output"
    >
      <div className="ch-marker">03</div>
      <div className="ch-eyebrow">
        <span>
          Ch. <b>03</b>
        </span>
        <span>· From input to output</span>
      </div>
      <h2 className="ch-title">
        JSON in. <em>Tailwind out.</em>
      </h2>
      <p className="ch-lede">
        Every artifact downstream — plugin, safelist, CSS variables, dark theme
        overrides, typed tokens — is regenerated whenever{" "}
        <code>theme.json</code> changes.
      </p>

      <div className="build-grid reveal">
        <CodeCard
          filename="theme.json"
          tag="source"
          lang="json"
          code={THEME_JSON}
        />
        <div className="arrow-step">
          <div className="arrow-anim">
            <ArrowRight />
          </div>
          <span className="lbl">compile</span>
        </div>
        <CodeCard filename="theme.css" tag="v4" lang="css" code={THEME_CSS} />
      </div>
    </section>
  );
}
