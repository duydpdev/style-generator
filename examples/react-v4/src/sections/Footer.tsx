import { Box, Flex, Text } from "../ui";

export const Footer = () => {
  return (
    <Box
      as="footer"
      mt={6}
      borderT="thin"
      pt={16}
      pb={20}
      style={{ borderColor: "var(--c-line)" }}
    >
      <Flex wrap align="end" justify="between" gap={6}>
        <Box>
          <Box
            as="p"
            mb={3}
            data-part="sg-font-display footer-quote"
            style={{ color: "var(--color-foreground)" }}
          >
            "Change <code>theme.json</code> — everything downstream re-renders."
          </Box>
          <Text type="text12Mono" color="muted">
            @duydpdev/style-generator · MIT · 2026
          </Text>
        </Box>
        <Text type="text12Mono" color="muted">
          React 19 · Tailwind v4 · cva · twMerge
        </Text>
      </Flex>
    </Box>
  );
};
