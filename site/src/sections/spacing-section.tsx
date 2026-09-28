import { CodeCard } from "../components/code-card";

const SPACING_CODE = `import { resolveSpacingProps } from
  "@duydpdev/style-generator/spacing";

function Box({ p, m, gap, children }) {
  const s = resolveSpacingProps({ p, m, gap });
  return (
    <div className={s.classNames.join(" ")}
         style={s.style}>
      {children}
    </div>
  );
}

// Usage
<Box p={4} />
// → class="sp-p" style="--sg-sp-p:1rem"

<Box p={{ base: 2, md: 4, lg: 8 }} />
// → --sg-sp-p:.5rem  --sg-sp-p-md:1rem
//   --sg-sp-p-lg:2rem`;

/**
 *
 */
export function SpacingSection() {
  return (
    <section
      id="spacing"
      className="chapter"
      data-ch="05"
      data-ch-label="Zero-safelist spacing"
    >
      <div className="ch-marker">05</div>
      <div className="ch-eyebrow">
        <span>
          Ch. <b>05</b>
        </span>
        <span>· The killer feature</span>
      </div>
      <h2 className="ch-title">
        Zero-safelist <em>responsive spacing.</em>
      </h2>
      <p className="ch-lede">
        The big win: responsive padding, margin and gap without inflating the
        class list. Custom properties carry the values; one utility per axis
        carries the rule.
      </p>

      <div className="spacing-grid reveal">
        <div>
          <div className="stat-pair">
            <div className="stat-card bad">
              <span className="k">Bare Tailwind</span>
              <span className="v">~4 800</span>
              <span className="m">
                classes safelisted for axis × size × bp.
              </span>
            </div>
            <div className="stat-card good">
              <span className="k">style-generator</span>
              <span className="v">0</span>
              <span className="m">
                CSS custom properties + a handful of rules.
              </span>
            </div>
          </div>
          <ul className="spacing-bullets">
            <li>
              <b>One utility per axis.</b>
              <span className="meta">
                {" "}
                <code>.sp-p</code>, <code>.sp-px</code>, <code>.sp-m</code> —
                that's it.
              </span>
            </li>
            <li>
              <b>
                Responsive via <code>var()</code> fallbacks.
              </b>
              <span className="meta">
                {" "}
                <code>--sg-sp-p-md</code> overrides <code>--sg-sp-p</code> at
                the breakpoint.
              </span>
            </li>
            <li>
              <b>Inline-style driven.</b>
              <span className="meta">
                {" "}
                Values live on the element. No safelist regex.
              </span>
            </li>
          </ul>
        </div>
        <CodeCard
          filename="Box.tsx"
          tag="react"
          lang="ts"
          code={SPACING_CODE}
        />
      </div>
    </section>
  );
}
