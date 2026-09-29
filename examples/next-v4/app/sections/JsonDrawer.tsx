import { useEffect, useMemo, useState } from "react";

import { Box } from "../components/Box";
import { Button } from "../components/Button";
import baseTheme from "../theme/theme.json";

import { PALETTES, type PaletteId } from "./palettes";

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
    <aside
      className="sg-json-drawer sg-glass-target"
      data-open={open ? "true" : "false"}
      aria-hidden={!open}
    >
      <Box
        px={6}
        py={5}
        className="flex items-center justify-between border-b"
        style={{ borderColor: "var(--c-line)" }}
      >
        <h3
          className="sg-font-display m-0 text-[22px]"
          style={{ color: "var(--color-foreground)" }}
        >
          theme.json
        </h3>
        <Box gap={1} className="flex">
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
        </Box>
      </Box>
      <div className="sg-json-body">
        <pre dangerouslySetInnerHTML={{ __html: highlight(activeJson) }} />
      </div>
    </aside>
  );
};
