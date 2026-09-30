import { Box } from "../components/Box";
import { Text } from "../components/Text";

export const Footer = () => {
  return (
    <footer
      className="mt-6 border-t pt-16 pb-20"
      style={{ borderColor: "var(--c-line)" }}
    >
      <Box className="flex flex-wrap items-end justify-between gap-6">
        <Box>
          <p
            className="sg-font-display m-0 mb-3 max-w-[38ch] text-[28px] leading-tight"
            style={{ color: "var(--color-foreground)" }}
          >
            "Change <code>theme.json</code> — everything downstream re-renders."
          </p>
          <Text type="text12Mono" color="muted">
            @duydpdev/style-generator · MIT · 2026
          </Text>
        </Box>
        <Text type="text12Mono" color="muted">
          React 18 · Tailwind v4 · cva · twMerge
        </Text>
      </Box>
    </footer>
  );
};
