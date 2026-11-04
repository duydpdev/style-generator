import { Box, Button, Flex, Grid, Text } from "../ui";

import { SectionHead } from "./SectionHead";

const COLORS = ["primary", "secondary", "success", "danger"] as const;
const VARIANTS = [
  { id: "fill", label: "Fill" },
  { id: "outline", label: "Outline" },
  { id: "soft", label: "Soft" },
  { id: "link", label: "Link" },
] as const;
const SIZES = ["sm", "md", "lg"] as const;

export const ButtonSection = () => {
  return (
    <Box as="section" borderT="thin" py={14} borderColor="line">
      {/* #region docs:usage */}
      <SectionHead
        num="04 — Button"
        title="cva × compoundVariants."
        desc={
          <>
            Sixteen permutations from a single <code>buttonRecipe</code>. Each
            cell here is the rendered class chain — final classes are merged
            through <code>cn(clsx, twMerge)</code>.
          </>
        }
      />

      <Box mx={-8} px={8} py={2} className="x-scroll-x">
        <Grid
          columns={{
            base: "72px repeat(4, minmax(0, 1fr))",
            md: "120px repeat(4, minmax(0, 1fr))",
          }}
          align="center"
          gapX={4}
          gapY={4}
          className="x-button-matrix"
        >
          <Box />
          {COLORS.map((c) => (
            <Text key={c} type="text12Mono" color="muted">
              {c}
            </Text>
          ))}
          {VARIANTS.map((v) => (
            <Box key={v.id} className="x-display-contents">
              <Text type="text12Mono" color="muted" className="x-caps-wide">
                {v.label}
              </Text>
              {COLORS.map((c) => (
                <Box key={`${v.id}-${c}`}>
                  <Button variant={v.id} color={c}>
                    {v.label.toLowerCase()}
                  </Button>
                </Box>
              ))}
            </Box>
          ))}
        </Grid>
      </Box>

      <Box
        mt={10}
        pt={7}
        borderT="thin"
        className="x-dashed"
        borderColor="line"
      >
        <Text type="text12Mono" color="muted" mb={4} className="x-caps-wide">
          Sizes
        </Text>
        <Flex wrap align="center" gap={3}>
          {SIZES.map((s) => (
            <Button key={s} variant="fill" color="primary" size={s}>
              size · {s}
            </Button>
          ))}
        </Flex>
      </Box>
      {/* #endregion docs:usage */}
    </Box>
  );
};
