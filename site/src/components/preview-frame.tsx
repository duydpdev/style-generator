import { useEffect, useRef, useState } from "react";

import type { ThemeMode } from "../lib/use-theme";

interface Props {
  src: string;
  pathLabel: string;
  /** Text before the theme in the titlebar, e.g. `TW v4`. */
  metaPrefix: string;
  siteTheme: ThemeMode;
  title: string;
}

/**
 * Same-origin contract with `examples/react-v4/src/App.tsx`: the shell sends the
 * site theme, the example reports the theme it renders (its own Light / Dark /
 * High contrast button can differ from the site's).
 */
const SITE_THEME_MESSAGE = "sg-site-theme";
const FRAME_THEME_MESSAGE = "sg-example-theme";

const FRAME_THEME_LABEL: Record<string, string> = {
  base: "light",
  dark: "dark",
  highContrast: "high contrast",
};

export function PreviewFrame({
  src,
  pathLabel,
  metaPrefix,
  siteTheme,
  title,
}: Readonly<Props>) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  // The iframe is loaded once with the theme the site had at mount; later
  // toggles are posted to it, so they never reload it and drop its state.
  const [initialTheme] = useState<ThemeMode>(siteTheme);
  const sentTheme = useRef<ThemeMode>(initialTheme);
  const [frameTheme, setFrameTheme] = useState<string>(initialTheme);

  useEffect(() => {
    if (sentTheme.current === siteTheme) return;
    sentTheme.current = siteTheme;
    frameRef.current?.contentWindow?.postMessage(
      { type: SITE_THEME_MESSAGE, theme: siteTheme },
      window.location.origin,
    );
  }, [siteTheme]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      const frameWindow = frameRef.current?.contentWindow ?? null;
      if (
        event.origin !== window.location.origin ||
        event.source !== frameWindow
      ) {
        return;
      }
      const data = event.data;
      if (typeof data !== "object" || data === null) return;
      const { type, theme } = data as Record<string, unknown>;
      if (type === FRAME_THEME_MESSAGE && typeof theme === "string") {
        setFrameTheme(theme);
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return (
    <div className="preview-stage">
      <div className="preview-frame-wrap">
        <div className="frame-titlebar">
          <div className="traffic">
            <span />
            <span />
            <span />
          </div>
          <div className="url-pill">
            <svg className="ic lock" viewBox="0 0 16 16" aria-hidden="true">
              <rect x="3" y="7" width="10" height="7" rx="1" />
              <path d="M5 7V5a3 3 0 016 0v2" />
            </svg>
            <span className="host">localhost:5174</span>
            <span className="path">{pathLabel}</span>
          </div>
          <div className="frame-meta">
            {metaPrefix} · {FRAME_THEME_LABEL[frameTheme] ?? frameTheme}
          </div>
        </div>
        <iframe
          key={src}
          ref={frameRef}
          className="preview-iframe"
          data-testid="example-preview"
          src={`${src}?theme=${initialTheme}`}
          title={title}
          sandbox="allow-scripts allow-same-origin allow-forms"
          loading="lazy"
        />
      </div>
    </div>
  );
}
