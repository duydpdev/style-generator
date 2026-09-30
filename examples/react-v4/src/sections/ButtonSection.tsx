import { Box } from "../components/Box";
import { Button } from "../components/Button";
import { Text } from "../components/Text";

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
    <section
      className="border-t py-14"
      style={{ borderColor: "var(--c-line)" }}
    >
      <SectionHead
        num="04 — Button"
        title="cva × compoundVariants."
        desc={
          <>
            Sixteen permutations from a single <code>style.ts</code>. Each cell
            here is the rendered class chain — final classes are merged through{" "}
            <code>cn(clsx, twMerge)</code>.
          </>
        }
      />

      <Box className="grid grid-cols-[120px_repeat(4,1fr)] items-center gap-x-4 gap-y-4">
        <div />
        {COLORS.map((c) => (
          <Text key={c} type="text12Mono" color="muted">
            {c}
          </Text>
        ))}
        {VARIANTS.map((v) => (
          <Box key={v.id} className="contents">
            <Text
              type="text12Mono"
              color="muted"
              className="uppercase tracking-wider"
            >
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
      </Box>

      <Box
        mt={10}
        pt={7}
        className="border-t border-dashed"
        style={{ borderColor: "var(--c-line)" }}
      >
        <Text
          type="text12Mono"
          color="muted"
          className="mb-4 block uppercase tracking-wider"
        >
          Sizes
        </Text>
        <Box gap={3} className="flex flex-wrap items-center">
          {SIZES.map((s) => (
            <Button key={s} variant="fill" color="primary" size={s}>
              size · {s}
            </Button>
          ))}
        </Box>
      </Box>
    </section>
  );
};
