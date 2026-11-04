import { Box, Button, Flex, Stack, Text } from "../ui";

import type { ThemeName } from "./types";

const THEME_LABEL: Record<ThemeName, string> = {
  base: "Light",
  dark: "Dark",
  highContrast: "High contrast",
};

interface TopbarProps {
  theme: ThemeName;
  onCycleTheme: () => void;
  onOpenJson: () => void;
  onToggleTweaks: () => void;
}

export const Topbar = ({
  theme,
  onCycleTheme,
  onOpenJson,
  onToggleTweaks,
}: TopbarProps) => {
  return (
    <Box as="header" className="x-sg-topbar">
      <Box className="x-container" maxWidth={1240} px={{ base: 4, md: 8 }}>
        <Flex
          wrap
          align="center"
          justify="between"
          gapX={6}
          gapY={2}
          py={2}
          minHeight={64}
        >
          <Flex gap={3} align="center" minWidth={0}>
            <Box
              as="span"
              className="x-sg-brand-mark x-no-shrink"
              aria-hidden
            />
            <Stack minWidth={0} className="x-topbar-brand-text">
              <Text type="text14Regular" className="x-text-medium x-truncate">
                @duydpdev/style-generator
              </Text>
              <Text
                type="text12Mono"
                color="muted"
                className="x-truncate x-md-only"
              >
                tokens → tailwind v4
              </Text>
            </Stack>
          </Flex>
          <Flex gap={2} wrap align="center">
            <Button variant="ghost" size="sm" onClick={onToggleTweaks}>
              Tweaks
            </Button>
            <Button variant="ghost" size="sm" onClick={onCycleTheme}>
              {THEME_LABEL[theme]}
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenJson}>
              theme.json
            </Button>
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
};
