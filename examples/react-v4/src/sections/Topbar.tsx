import { Box } from "../components/Box";
import { Button } from "../components/Button";
import { Text } from "../components/Text";

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
    <header className="sg-topbar">
      <Box
        px={{ base: 4, md: 8 }}
        className="mx-auto flex min-h-16 max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2"
      >
        <Box gap={3} className="flex min-w-0 items-center">
          <span className="sg-brand-mark shrink-0" aria-hidden />
          <Box className="flex min-w-0 flex-col leading-tight">
            <Text type="text14Regular" className="truncate font-medium">
              @duydpdev/style-generator
            </Text>
            <Text
              type="text12Mono"
              color="muted"
              className="hidden truncate md:block"
            >
              tokens → tailwind v4
            </Text>
          </Box>
        </Box>
        <Box gap={2} className="flex flex-wrap items-center">
          <Button variant="ghost" size="sm" onClick={onToggleTweaks}>
            Tweaks
          </Button>
          <Button variant="ghost" size="sm" onClick={onCycleTheme}>
            {THEME_LABEL[theme]}
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenJson}>
            theme.json
          </Button>
        </Box>
      </Box>
    </header>
  );
};
