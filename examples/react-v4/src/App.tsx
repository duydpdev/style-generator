import { useCallback, useEffect, useState } from "react";

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
import type { StyleGuideState, TweakSetter } from "./sections/types";

const INITIAL: StyleGuideState = {
  palette: "cobalt",
  theme: "light",
  voice: "editorial",
  geometry: "soft",
  surface: "lifted",
};

export const App = () => {
  const [state, setState] = useState<StyleGuideState>(INITIAL);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  useEffect(() => {
    const r = document.documentElement.dataset;
    r.palette = state.palette;
    r.theme = state.theme;
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
        onToggleTheme={() => {
          setTweak("theme", state.theme === "dark" ? "light" : "dark");
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
