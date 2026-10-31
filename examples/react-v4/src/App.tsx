import { useCallback, useEffect, useRef, useState } from "react";
import { axisAttributes } from "design-system-example";

import {
  FRAME_THEME_MESSAGE,
  INITIAL,
  SITE_THEME_MESSAGE,
  THEME_CYCLE,
  fromSiteTheme,
  initialState,
} from "./App.data";
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
import { Container } from "./ui";

export const App = () => {
  const [state, setState] = useState<StyleGuideState>(initialState);
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

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent
      ) {
        return;
      }
      const data = event.data;
      if (typeof data !== "object" || data === null) return;
      const { type, theme } = data as Record<string, unknown>;
      if (type !== SITE_THEME_MESSAGE) return;
      const next = fromSiteTheme(theme);
      if (next) setTweak("theme", next);
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [setTweak]);

  // Report the theme in use so the host shell labels its preview truthfully.
  useEffect(() => {
    if (window.parent === window) return;
    window.parent.postMessage(
      { type: FRAME_THEME_MESSAGE, theme: state.theme },
      window.location.origin,
    );
  }, [state.theme]);

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

      <Container maxWidth={1240} px={8}>
        <HeroSection
          palette={state.palette}
          onPickPalette={(id) => {
            setTweak("palette", id);
          }}
        />
        <ColorSection palette={state.palette} theme={state.theme} />
        <TypographySection />
        <UtilitiesSection />
        <ButtonSection />
        <ResponsiveSpacingSection />
        <Footer />
      </Container>

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
