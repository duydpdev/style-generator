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
        px={8}
        className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-6"
      >
        <Box gap={3} className="flex items-center">
          <span className="sg-brand-mark" aria-hidden />
          <Box className="flex flex-col leading-tight">
            <Text type="text14Regular" className="font-medium">
              @duydpdev/style-generator
            </Text>
            <Text type="text12Mono" color="muted">
              tokens → tailwind v4
            </Text>
          </Box>
        </Box>
        <Box gap={2} className="flex items-center">
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
