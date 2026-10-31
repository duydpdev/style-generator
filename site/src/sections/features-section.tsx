import type { ReactNode } from "react";

import { ChapterHead } from "../components/chapter-head";
import { Box, Grid, Stack, Text } from "../ui";

interface Feat {
  part: string;
  tag: string;
  title: string;
  body: ReactNode;
}

const FEATS: Feat[] = [
  {
    part: "feat-wide",
    tag: "root",
    title: "generate()",
    body: (
      <>
        Single entry. Returns <code>css</code> (the full Tailwind v4 CSS
        string), <code>tokens</code> (typed <code>DesignTokens</code>) and the
        theme's JSON <code>schema</code>.
      </>
    ),
  },
  {
    part: "feat-wide",
    tag: "root",
    title: "defineTheme()",
    body: (
      <>
        Type-checks the theme at compile time and validates it with the same
        schema at runtime.
      </>
    ),
  },
  {
    part: "feat-narrow",
    tag: "/spacing",
    title: "resolveSpacingProps()",
    body: (
      <>
        Maps <code>p={"{...}"}</code> to CSS custom properties.
      </>
    ),
  },
  {
    part: "feat-narrow",
    tag: "/cva",
    title: "createVariantMapper()",
    body: <>Token → class lookup for CVA. Kebab auto.</>,
  },
  {
    part: "feat-narrow",
    tag: "/vite",
    title: "styleGenVite()",
    body: <>Watches theme.json. HMR-friendly.</>,
  },
  {
    part: "feat-wide",
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
    part: "feat-wide",
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
    <Box
      as="section"
      id="features"
      data-ch="04"
      data-ch-label="API surface"
      pt={14}
      pb={2}
      mt={6}
    >
      <ChapterHead
        num="04"
        label="What's in the box"
        title={
          <>
            Seven primitives. <em>One pipeline.</em>
          </>
        }
        lede={
          <>
            Each feature is an opt-in subpath import. Spacing helpers don't pull
            the CLI; the types file has zero runtime. Pay only for what you use.
          </>
        }
      />

      <Grid data-part="bento" data-reveal="stagger" gap={3.5}>
        {FEATS.map((f) => (
          <Stack
            as="article"
            key={f.tag + f.title}
            data-part={`feat ${f.part}`}
            gap={2}
            p={4.5}
            rounded="lg"
            position="relative"
          >
            <Box
              as="span"
              data-part="feat-tag"
              px={2}
              py={0.5}
              rounded="pill"
              backgroundColor="primarySoft"
            >
              {f.tag}
            </Box>
            <Box as="h4" mt={1} position="relative">
              {f.title}
            </Box>
            <Text as="p" color="muted">
              {f.body}
            </Text>
          </Stack>
        ))}
      </Grid>
    </Box>
  );
}
