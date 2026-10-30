import { ChapterHead } from "../components/chapter-head";
import { Box } from "../ui";
import { Check, Cross } from "../components/icon";

interface Item {
  title: string;
  meta: string;
}

const PROS: Item[] = [
  {
    title: "Velocity from day one",
    meta: "Utility-first means no naming, no context-switching. Bottomless palette of primitives.",
  },
  {
    title: "JIT & tree-shaking",
    meta: "Only used classes ship. Bundle stays flat as the app grows.",
  },
  {
    title: "Opinionated constraints",
    meta: "Type scale, spacing, radii. Stops bikeshedding before it starts.",
  },
  {
    title: "Massive ecosystem",
    meta: "shadcn, Catalyst, Headless UI — all aboard.",
  },
];

const CONS: Item[] = [
  {
    title: "Dynamic classes are a minefield",
    meta: "JIT can't see bg-${x}. Hand-rolled safelists or duplicated markup.",
  },
  {
    title: "Theming is manual",
    meta: "Dark mode, brand variants — wire CSS vars + selectors yourself, every project.",
  },
  {
    title: "Responsive spacing explodes",
    meta: "Axis × size × bp = ~4 800 classes safelisted “just in case”.",
  },
  {
    title: "No typed design tokens",
    meta: "Config can't be re-used as component prop types. Drift on you.",
  },
];

/**
 *
 */
export function WhySection() {
  return (
    <Box
      as="section"
      id="why"
      data-ch="01"
      data-ch-label="The Tailwind case"
      pt={14}
      pb={2}
      mt={6}
    >
      <ChapterHead
        num="01"
        label="The Tailwind case"
        title={
          <>
            Tailwind ships fast, then <em>gets in your way.</em>
          </>
        }
        lede={
          <>
            Tailwind is the right default for most apps — but anyone shipping a
            real product has hit the same wall. Here's the lay of the land
            before <b>style-generator</b> enters.
          </>
        }
      />

      <div className="judgement-grid" data-reveal="stagger">
        <div className="judgement pro">
          <div className="judgement-head">
            <span className="j-tag">Strengths</span>
            <h3 className="j-head-title">What it nails.</h3>
          </div>
          <ul className="j-list">
            {PROS.map((it) => (
              <li key={it.title}>
                <span className="mark">
                  <Check />
                </span>
                <div>
                  <b>{it.title}</b>
                  <span className="meta">{it.meta}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="judgement con">
          <div className="judgement-head">
            <span className="j-tag">Friction</span>
            <h3 className="j-head-title">Where it hurts.</h3>
          </div>
          <ul className="j-list">
            {CONS.map((it) => (
              <li key={it.title}>
                <span className="mark">
                  <Cross />
                </span>
                <div>
                  <b>{it.title}</b>
                  <span className="meta">{it.meta}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Box>
  );
}
