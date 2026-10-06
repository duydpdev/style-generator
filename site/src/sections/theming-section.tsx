interface PreviewProps {
  variant: "light" | "dark";
  tag: string;
  folio: string;
  title: React.ReactNode;
  swatches: { color: string; label: string; border?: string }[];
  marker: string;
}

/**
 *
 * @param root0
 * @param root0.variant
 * @param root0.tag
 * @param root0.folio
 * @param root0.title
 * @param root0.swatches
 * @param root0.marker
 */
function Preview({
  variant,
  tag,
  folio,
  title,
  swatches,
  marker,
}: Readonly<PreviewProps>) {
  return (
    <div className={`theme-preview ${variant}`}>
      <div className="tp-head">
        <span className="tp-tag">{tag}</span>
        <span className="tp-folio">{folio}</span>
      </div>
      <h3 className="tp-title">{title}</h3>
      <div className="tp-card">
        {swatches.map((s) => (
          <div key={s.label} className="tp-row">
            <span
              className="sw"
              style={{
                background: s.color,
                ...(s.border ? { border: s.border } : null),
              }}
            />
            {s.label}
          </div>
        ))}
      </div>
      <button type="button" className="tp-btn">
        Primary button
      </button>
      <span className="tp-marker">{marker}</span>
    </div>
  );
}

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
    <section
      id="theming"
      className="chapter"
      data-ch="06"
      data-ch-label="Theming"
    >
      <div className="ch-marker">06</div>
      <div className="ch-eyebrow">
        <span>
          Ch. <b>06</b>
        </span>
        <span>· Theming</span>
      </div>
      <h2 className="ch-title">
        Dark mode, <em>in JSON.</em>
      </h2>
      <p className="ch-lede">
        Add a <code>themeAxes.theme.dark</code> block to your config.{" "}
        <code>html[data-theme="dark"]</code> overrides — including shadows —
        generate automatically. Switch by toggling one attribute on{" "}
        <code>&lt;html&gt;</code>.
      </p>

      <div className="theme-grid reveal">
        <Preview
          variant="light"
          tag='html[data-theme="light"]'
          folio="A · default"
          title="Same markup. Same component."
          swatches={LIGHT_SWATCHES}
          marker="→ vars resolve to JSON top-level"
        />
        <Preview
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
      </div>
    </section>
  );
}
