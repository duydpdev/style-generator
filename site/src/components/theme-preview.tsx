import type { ReactNode } from "react";

import { Box, Flex, Stack, Text } from "../ui";

interface Props {
  variant: "light" | "dark";
  tag: string;
  folio: string;
  title: ReactNode;
  swatches: { color: string; label: string; border?: string }[];
  marker: string;
}

/**
 *
 * @param root0
 * @param root0.variant
 * @param root0.tag
 * @param root0.folio
 * @param root0.title
 * @param root0.swatches
 * @param root0.marker
 */
export function ThemePreview({
  variant,
  tag,
  folio,
  title,
  swatches,
  marker,
}: Readonly<Props>) {
  return (
    <Stack
      data-part={
        variant === "light" ? "theme-preview light" : "theme-preview dark"
      }
      gap={3.5}
      p={5.5}
      minHeight={240}
      rounded="lg"
      position="relative"
    >
      <Flex justify="between" align="center">
        <Box as="span" data-part="tp-tag" px={2.25} py={0.75} rounded="pill">
          {tag}
        </Box>
        <Text as="span" data-part="tp-folio">
          {folio}
        </Text>
      </Flex>
      <Text as="h3" data-part="tp-title">
        {title}
      </Text>
      <Stack data-part="tp-card" gap={1.75} p={3.5} rounded="md">
        {swatches.map((s) => (
          <Flex key={s.label} data-part="tp-row" align="center" gap={2.5}>
            <Box
              as="span"
              data-part="sw"
              width={16}
              height={16}
              style={{
                background: s.color,
                ...(s.border ? { border: s.border } : null),
              }}
            />
            {s.label}
          </Flex>
        ))}
      </Stack>
      <Box as="button" type="button" data-part="tp-btn" px={3.5} py={1.75}>
        Primary button
      </Box>
      <Box as="span" data-part="tp-marker" px={2} py={1}>
        {marker}
      </Box>
    </Stack>
  );
}
