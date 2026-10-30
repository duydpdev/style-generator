import { useEffect, useMemo, useState } from "react";
import { theme as baseTheme } from "design-system-example";

import { Box, Button, Flex } from "../ui";

import { PALETTES } from "./paletteColors";
import type { PaletteId } from "./types";

interface JsonDrawerProps {
  open: boolean;
  onClose: () => void;
  palette: PaletteId;
}

const highlight = (json: string) =>
  json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/("(\\.|[^"])*?")\s*:/g, '<span class="sg-json-k">$1</span>:')
    .replace(/:\s*("(\\.|[^"])*?")/g, ': <span class="sg-json-s">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span class="sg-json-n">$1</span>')
    .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="sg-json-n">$1</span>');

export const JsonDrawer = ({ open, onClose, palette }: JsonDrawerProps) => {
  const [copied, setCopied] = useState(false);

  const activeJson = useMemo(() => {
    const colors = PALETTES[palette].light;
    const darkColors = PALETTES[palette].dark;
    const darkOverrides: Record<string, string> = {};
    (Object.keys(colors) as (keyof typeof colors)[]).forEach((k) => {
      if (darkColors[k] !== colors[k]) darkOverrides[k] = darkColors[k];
    });
    return JSON.stringify(
      {
        colors,
        typography: baseTheme.typography,
        shadows: baseTheme.shadows,
        backDropBlurs: baseTheme.backDropBlurs,
        borderRadius: baseTheme.borderRadius,
        themeAxes: {
          theme: {
            dark: {
              colors: darkOverrides,
              shadows: baseTheme.themeAxes.theme.dark.shadows,
            },
          },
        },
      },
      null,
      2,
    );
  }, [palette]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => {
      setCopied(false);
    }, 1400);
    return () => {
      clearTimeout(t);
    };
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(activeJson);
      setCopied(true);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Box
      as="aside"
      data-part="sg-json-drawer sg-glass-target"
      data-open={open ? "true" : "false"}
      aria-hidden={!open}
    >
      <Flex
        px={6}
        py={5}
        align="center"
        justify="between"
        borderB="thin"
        style={{ borderColor: "var(--c-line)" }}
      >
        <Box
          as="h3"
          data-part="sg-font-display drawer-title"
          style={{ color: "var(--color-foreground)" }}
        >
          theme.json
        </Box>
        <Flex gap={1}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void copy();
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </Flex>
      </Flex>
      <Box data-part="sg-json-body">
        <pre dangerouslySetInnerHTML={{ __html: highlight(activeJson) }} />
      </Box>
    </Box>
  );
};
