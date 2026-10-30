import { ChapterHead } from "../components/chapter-head";
import { Box, Grid } from "../ui";
import { Check, Cross } from "../components/icon";

import { JudgementPanel, type JudgementItem } from "./judgement-panel";

const PROS: JudgementItem[] = [
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

const CONS: JudgementItem[] = [
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

const PANELS = [
  {
    part: "pro",
    tint: "successSoft",
    tag: "Strengths",
    heading: "What it nails.",
    items: PROS,
    icon: <Check />,
  },
  {
    part: "con",
    tint: "dangerSoft",
    tag: "Friction",
    heading: "Where it hurts.",
    items: CONS,
    icon: <Cross />,
  },
] as const;

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

      <Grid data-part="judgement-grid" data-reveal="stagger" gap={6}>
        {PANELS.map((p) => (
          <JudgementPanel key={p.part} {...p} />
        ))}
      </Grid>
    </Box>
  );
}
