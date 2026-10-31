"use client";

import { useEffect, useRef, useState } from "react";
import { axisAttributes } from "design-system-example";

import { Button, Flex, Select, Stack, Text } from "./ui";

type AxesState = Parameters<typeof axisAttributes>[0];
type ThemeName = NonNullable<AxesState["theme"]>;
type PaletteName = NonNullable<AxesState["palette"]>;

const THEMES: readonly ThemeName[] = ["base", "dark", "highContrast"];
const PALETTES: readonly PaletteName[] = ["base", "forest", "sunset", "mono"];

/**
 * Next-specific piece: a client component, because the axis attributes live on
 * `<html>`, which a server component cannot reach after hydration. The
 * attribute map comes from the design system's `axisAttributes`; a variant that
 * is `"base"` produces no attribute, so the keys the previous map had and the
 * next one lacks are removed.
 * @returns The two axis pickers.
 */
export function ThemeSwitch() {
  const [state, setState] = useState<AxesState>({
    theme: "base",
    palette: "base",
  });

  const applied = useRef<readonly string[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    const attributes = axisAttributes(state);
    for (const name of applied.current) {
      if (!(name in attributes)) root.removeAttribute(name);
    }
    for (const [name, value] of Object.entries(attributes)) {
      root.setAttribute(name, value);
    }
    applied.current = Object.keys(attributes);
  }, [state]);

  return (
    <Flex wrap gap={4}>
      <Stack as="label" align="start" gap={1}>
        <Text as="span" type="text12Mono" color="muted">
          theme
        </Text>
        <Select
          size="sm"
          value={state.theme}
          onChange={(event) => {
            setState((prev) => ({
              ...prev,
              theme: event.target.value as ThemeName,
            }));
          }}
        >
          {THEMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </Stack>
      <Stack as="label" align="start" gap={1}>
        <Text as="span" type="text12Mono" color="muted">
          palette
        </Text>
        <Select
          size="sm"
          value={state.palette}
          onChange={(event) => {
            setState((prev) => ({
              ...prev,
              palette: event.target.value as PaletteName,
            }));
          }}
        >
          {PALETTES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </Stack>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setState({ theme: "base", palette: "base" });
        }}
      >
        Reset
      </Button>
    </Flex>
  );
}
