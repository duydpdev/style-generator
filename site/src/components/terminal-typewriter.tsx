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
  const [shown, setShown] = useState<TermLine[]>([]);
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
      setShown((s) => [...s, line]);
      idx++;
      window.setTimeout(tick, line.delay);
    };
    tick();
    return () => {
      cancel = true;
    };
  }, [started, lines]);

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
      <div ref={bodyRef} className="terminal-body">
        {shown.map((l, i) => (
          <div
            key={i}
            className="line"
            dangerouslySetInnerHTML={{ __html: l.html }}
          />
        ))}
      </div>
    </div>
  );
}
