import { useEffect, useRef, useState } from "react";

export interface TermLine {
  html: string;
  delay: number;
}

interface Props {
  lines: TermLine[];
  filename?: string;
}

/**
 *
 * @param root0
 * @param root0.lines
 * @param root0.filename
 */
export function TerminalTypewriter({
  lines,
  filename = "~/my-app · zsh",
}: Readonly<Props>) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started) {
            setStarted(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let idx = 0;
    let cancel = false;
    const tick = () => {
      if (cancel || idx >= lines.length) return;
      const line = lines[idx];
      setShown(idx + 1);
      idx++;
      window.setTimeout(tick, line.delay);
    };
    tick();
    return () => {
      cancel = true;
    };
  }, [started, lines]);

  // Every line is rendered from the first paint (hidden until revealed), so
  // the box never grows; this only matters when the body itself overflows.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown]);

  return (
    <div className="terminal">
      <div className="code-head">
        <span className="dots">
          <span />
          <span />
          <span />
        </span>
        <span className="filename">{filename}</span>
      </div>
      <div ref={bodyRef} className="terminal-body" data-testid="terminal-body">
        {lines.map((l, i) => {
          const revealed = i < shown;
          return (
            <div
              key={i}
              className="line"
              data-line-state={revealed ? "shown" : "pending"}
              aria-hidden={!revealed}
              style={{ visibility: revealed ? "visible" : "hidden" }}
              dangerouslySetInnerHTML={{ __html: l.html }}
            />
          );
        })}
      </div>
    </div>
  );
}
