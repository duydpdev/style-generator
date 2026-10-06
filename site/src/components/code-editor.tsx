import { useMemo } from "react";

import type { ExampleFile } from "../lib/example-files";
import { tokenize } from "../lib/tokenize";

interface Props {
  openTabs: ExampleFile[];
  activePath: string | null;
  onPick: (path: string) => void;
  onClose: (path: string) => void;
}

const LANG_LABEL: Record<string, string> = {
  ts: "TypeScript JSX",
  css: "CSS",
  json: "JSON",
  text: "Plain Text",
};

export function CodeEditor({
  openTabs,
  activePath,
  onPick,
  onClose,
}: Readonly<Props>) {
  const active = openTabs.find((f) => f.path === activePath) ?? null;

  const html = useMemo(
    () => (active ? tokenize(active.code, active.lang) : ""),
    [active],
  );

  const lineCount = active ? active.code.split("\n").length : 0;
  const gutter = useMemo(
    () =>
      Array.from({ length: lineCount }, (_, i) => i + 1)
        .map((n) => String(n))
        .join("\n"),
    [lineCount],
  );

  return (
    <div className="code-pane">
      <div className="code-tabs">
        {openTabs.map((t) => {
          const name = t.path.split("/").pop();
          return (
            <div
              key={t.path}
              className={`code-tab${t.path === activePath ? " active" : ""}`}
            >
              <button
                type="button"
                className="code-tab-pick"
                onClick={() => {
                  onPick(t.path);
                }}
              >
                {name}
              </button>
              <button
                type="button"
                className="close"
                aria-label={`Close ${name ?? t.path}`}
                onClick={() => {
                  onClose(t.path);
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {active ? (
        <div className="code-body-wrap">
          <pre className="code-gutter">{gutter}</pre>
          <div className="code-body-scroll">
            <pre dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      ) : (
        <div className="code-empty">
          Pick a file from the sidebar to start reading code.
        </div>
      )}

      <div className="code-statusbar">
        <div className="left">
          <span className="git-branch">⎇ main</span>
          <span>{active?.path ?? "—"}</span>
        </div>
        <div className="right">
          <span>
            <b>UTF-8</b>
          </span>
          <span>
            <b>{active ? (LANG_LABEL[active.lang] ?? "Plain") : "—"}</b>
          </span>
          <span>
            {lineCount > 0 ? `${String(lineCount)} lines` : "0 lines"}
          </span>
        </div>
      </div>
    </div>
  );
}
