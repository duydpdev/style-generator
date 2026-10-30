import { ChapterHead } from "../components/chapter-head";
import { Box } from "../ui";
import { CodeCard } from "../components/code-card";

const SPACING_CODE = `import { resolveSpacingProps } from
  "@duydpdev/style-generator/spacing";

function Box({ p, m, gap, children }) {
  const s = resolveSpacingProps({ p, m, gap });
  return (
    <div className={s.classNames}
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
    <Box
      as="section"
      id="spacing"
      data-ch="05"
      data-ch-label="Zero-safelist spacing"
      pt={14}
      pb={2}
      mt={6}
    >
      <ChapterHead
        num="05"
        label="The killer feature"
        title={
          <>
            Zero-safelist <em>responsive spacing.</em>
          </>
        }
        lede={
          <>
            The big win: responsive padding, margin and gap without inflating
            the class list. Custom properties carry the values; one utility per
            axis carries the rule.
          </>
        }
      />

      <div className="spacing-grid" data-reveal="up">
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
    </Box>
  );
}
