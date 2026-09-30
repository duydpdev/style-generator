import type { ReactNode } from "react";

interface Feat {
  cls: string;
  tag: string;
  title: string;
  body: ReactNode;
}

const FEATS: Feat[] = [
  {
    cls: "feat-1",
    tag: "/core",
    title: "generate()",
    body: (
      <>
        Single entry. Returns <code>css</code> (the full Tailwind CSS string)
        and <code>tokens</code>, typed <code>DesignTokens</code>.
      </>
    ),
  },
  {
    cls: "feat-2",
    tag: ".",
    title: "defineTheme()",
    body: (
      <>
        Type-safe theme config. Compile-time errors if you forget a required
        field.
      </>
    ),
  },
  {
    cls: "feat-3",
    tag: "/spacing",
    title: "resolveSpacingProps()",
    body: (
      <>
        Maps <code>p={"{...}"}</code> to CSS custom properties.
      </>
    ),
  },
  {
    cls: "feat-4",
    tag: "/cva",
    title: "createVariantMapper()",
    body: <>Token → class lookup for CVA. Kebab auto.</>,
  },
  {
    cls: "feat-5",
    tag: "/vite",
    title: "styleGenVite()",
    body: <>Watches theme.json. HMR-friendly.</>,
  },
  {
    cls: "feat-6",
    tag: "/types",
    title: "Semantic type aliases",
    body: (
      <>
        <code>ColorVariant&lt;Theme&gt;</code>, <code>TextVariant</code>,{" "}
        <code>ShadowVariant</code> — type your props in one line.
      </>
    ),
  },
  {
    cls: "feat-7",
    tag: "CLI",
    title: "style-gen — init · generate · doctor",
    body: (
      <>Interactive scaffold, watch-mode CSS regenerator, schema validator.</>
    ),
  },
];

/**
 *
 */
export function FeaturesSection() {
  return (
    <section
      id="features"
      className="chapter"
      data-ch="04"
      data-ch-label="API surface"
    >
      <div className="ch-marker">04</div>
      <div className="ch-eyebrow">
        <span>
          Ch. <b>04</b>
        </span>
        <span>· What's in the box</span>
      </div>
      <h2 className="ch-title">
        Seven primitives. <em>One pipeline.</em>
      </h2>
      <p className="ch-lede">
        Each feature is an opt-in subpath import. Spacing helpers don't pull the
        CLI; the types file has zero runtime. Pay only for what you use.
      </p>

      <div className="bento reveal-stagger">
        {FEATS.map((f) => (
          <article key={f.tag + f.title} className={`feat ${f.cls}`}>
            <span className="feat-tag">{f.tag}</span>
            <h4>{f.title}</h4>
            <p>{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
