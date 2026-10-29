import { useCallback, useEffect, useRef, useState } from "react";
import { axisAttributes } from "design-system-example";

import { Box } from "./components/Box";
import { ButtonSection } from "./sections/ButtonSection";
import { ColorSection } from "./sections/ColorSection";
import { Footer } from "./sections/Footer";
import { HeroSection } from "./sections/HeroSection";
import { JsonDrawer } from "./sections/JsonDrawer";
import { ResponsiveSpacingSection } from "./sections/ResponsiveSpacingSection";
import { Topbar } from "./sections/Topbar";
import { TweaksPanel } from "./sections/TweaksPanel";
import { TypographySection } from "./sections/TypographySection";
import { UtilitiesSection } from "./sections/UtilitiesSection";
import type { StyleGuideState, ThemeName, TweakSetter } from "./sections/types";

const THEME_CYCLE: readonly ThemeName[] = ["base", "dark", "highContrast"];

const INITIAL: StyleGuideState = {
  palette: "base",
  theme: "base",
  voice: "editorial",
  geometry: "soft",
  surface: "lifted",
};

export const App = () => {
  const [state, setState] = useState<StyleGuideState>(INITIAL);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const appliedAxes = useRef<string[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    const axes = axisAttributes({ theme: state.theme, palette: state.palette });
    // A `"base"` axis emits no attribute, so the previous one must go.
    for (const name of appliedAxes.current) {
      if (!(name in axes)) root.removeAttribute(name);
    }
    for (const [name, value] of Object.entries(axes)) {
      root.setAttribute(name, value);
    }
    appliedAxes.current = Object.keys(axes);

    const r = root.dataset;
    r.voice = state.voice;
    r.geometry = state.geometry;
    r.surface = state.surface;
  }, [state]);

  const setTweak = useCallback<TweakSetter>((key, value) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <>
      <Topbar
        theme={state.theme}
        onCycleTheme={() => {
          const next = THEME_CYCLE.indexOf(state.theme) + 1;
          setTweak("theme", THEME_CYCLE[next % THEME_CYCLE.length]);
        }}
        onOpenJson={() => {
          setJsonOpen(true);
        }}
        onToggleTweaks={() => {
          setTweaksOpen((v) => !v);
        }}
      />

      <Box className="mx-auto max-w-[1240px] px-8">
        <HeroSection
          palette={state.palette}
          onPickPalette={(id) => {
            setTweak("palette", id);
          }}
        />
        <ColorSection palette={state.palette} theme={state.theme} />
        <TypographySection />
        <UtilitiesSection />
        <ResponsiveSpacingSection />
        <ButtonSection />
        <Footer />
      </Box>

      <JsonDrawer
        open={jsonOpen}
        onClose={() => {
          setJsonOpen(false);
        }}
        palette={state.palette}
      />

      <TweaksPanel
        open={tweaksOpen}
        onClose={() => {
          setTweaksOpen(false);
        }}
        state={state}
        setTweak={setTweak}
        onReset={() => {
          setState(INITIAL);
        }}
      />
    </>
  );
};
