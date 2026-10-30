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
    <Box
      as="section"
      borderT="thin"
      py={14}
      style={{ borderColor: "var(--c-line)" }}
    >
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

      <Box mx={-8} px={8} py={2} data-part="scroll-x">
        <Grid align="center" gapX={4} gapY={4} data-part="button-matrix">
          <Box />
          {COLORS.map((c) => (
            <Text key={c} type="text12Mono" color="muted">
              {c}
            </Text>
          ))}
          {VARIANTS.map((v) => (
            <Box key={v.id} data-part="display-contents">
              <Text type="text12Mono" color="muted" data-part="caps-wide">
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
        data-part="dashed"
        style={{ borderColor: "var(--c-line)" }}
      >
        <Text type="text12Mono" color="muted" mb={4} data-part="caps-wide">
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
