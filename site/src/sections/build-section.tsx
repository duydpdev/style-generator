import { CodeCard } from "../components/code-card";
import { ArrowRight } from "../components/icon";
import { THEME_CSS, THEME_JSON } from "../data/build-sample";

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
        Every artifact downstream — CSS variables, dark theme overrides,
        typography and spacing utilities, <code>@source inline</code> coverage,
        typed tokens — is regenerated whenever <code>theme.json</code> changes.
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
        <CodeCard
          filename="theme.css"
          tag="generated"
          lang="css"
          code={THEME_CSS}
        />
      </div>
    </section>
  );
}
