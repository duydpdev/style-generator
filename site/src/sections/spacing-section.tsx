import { ChapterHead } from "../components/chapter-head";
import { Box, Grid, Stack, Text } from "../ui";
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

      <Grid data-part="spacing-grid" data-reveal="up" gap={6}>
        <Box>
          <Grid data-part="stat-pair" gap={3} mb={4}>
            <Stack data-part="stat-card bad" gap={1.5} p={4.5} rounded="lg">
              <Text as="span" data-part="k" color="muted">
                Bare Tailwind
              </Text>
              <Text as="span" data-part="v" color="danger">
                ~4 800
              </Text>
              <Text as="span" data-part="m" color="muted">
                classes safelisted for axis × size × bp.
              </Text>
            </Stack>
            <Stack data-part="stat-card good" gap={1.5} p={4.5} rounded="lg">
              <Text as="span" data-part="k" color="muted">
                style-generator
              </Text>
              <Text as="span" data-part="v" color="success">
                0
              </Text>
              <Text as="span" data-part="m" color="muted">
                CSS custom properties + a handful of rules.
              </Text>
            </Stack>
          </Grid>
          <Stack as="ul" data-part="spacing-bullets" gap={2.5}>
            <Box as="li" pl={5.5} position="relative">
              <b>One utility per axis.</b>
              <Text as="span" color="muted">
                {" "}
                <code>.sp-p</code>, <code>.sp-px</code>, <code>.sp-m</code> —
                that's it.
              </Text>
            </Box>
            <Box as="li" pl={5.5} position="relative">
              <b>
                Responsive via <code>var()</code> fallbacks.
              </b>
              <Text as="span" color="muted">
                {" "}
                <code>--sg-sp-p-md</code> overrides <code>--sg-sp-p</code> at
                the breakpoint.
              </Text>
            </Box>
            <Box as="li" pl={5.5} position="relative">
              <b>Inline-style driven.</b>
              <Text as="span" color="muted">
                {" "}
                Values live on the element. No safelist regex.
              </Text>
            </Box>
          </Stack>
        </Box>
        <CodeCard
          filename="Box.tsx"
          tag="react"
          lang="ts"
          code={SPACING_CODE}
        />
      </Grid>
    </Box>
  );
}
