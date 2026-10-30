import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { CodeEditor } from "../components/code-editor";
import { FileTree } from "../components/file-tree";
import { PreviewFrame } from "../components/preview-frame";
import { Topbar } from "../components/topbar";
import {
  EXAMPLE_FILES,
  fileCount,
  findFile,
  flatFiles,
  type ExampleFile,
  type Variant,
} from "../lib/example-files";
import { useTheme } from "../lib/use-theme";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const META: Record<
  Variant,
  { label: string; badge?: string; bundler: string }
> = {
  v4: { label: "React + TW v4", bundler: "vite + react" },
};

type View = "preview" | "code";

export function ExamplesPage() {
  const { variant } = useParams<{ variant?: string }>();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const [view, setView] = useState<View>("preview");
  const [openTabs, setOpenTabs] = useState<ExampleFile[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [filesOpen, setFilesOpen] = useState(false);
  const filesToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.body.classList.add("examples-mode");
    return () => {
      document.body.classList.remove("examples-mode");
    };
  }, []);

  // Bootstrap / reset tabs whenever the variant changes
  useEffect(() => {
    if (variant !== "v4") return;
    const first = flatFiles(variant).at(0);
    setOpenTabs(first ? [first] : []);
    setActivePath(first ? first.path : null);
    setView("preview");
  }, [variant]);

  // The file tree is an overlay on tablet/mobile: Escape closes it.
  useEffect(() => {
    if (!filesOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setFilesOpen(false);
      filesToggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [filesOpen]);

  if (variant !== "v4") return <Navigate to="/examples/v4" replace />;

  const v = variant;
  const meta = META[v];
  const iframeSrc = `${BASE}/examples/${v}/index.html`;

  const openFile = (path: string) => {
    const file = findFile(v, path);
    if (!file) return;
    setOpenTabs((tabs) =>
      tabs.some((t) => t.path === path) ? tabs : [...tabs, file],
    );
    setActivePath(path);
    setView("code");
    setFilesOpen(false);
  };

  const closeTab = (path: string) => {
    setOpenTabs((tabs) => {
      const next = tabs.filter((t) => t.path !== path);
      if (path === activePath) {
        setActivePath(next.length > 0 ? next[next.length - 1].path : null);
      }
      return next;
    });
  };

  const totalFiles = fileCount(v);

  return (
    <>
      <Topbar
        activeChapter={null}
        activeRoute="examples"
        onToggleTheme={toggle}
      />

      <div className="ex-shell">
        <button
          type="button"
          className={`ex-backdrop${filesOpen ? " open" : ""}`}
          aria-label="Close file tree"
          tabIndex={-1}
          onClick={() => {
            setFilesOpen(false);
          }}
        />
        <aside
          id="ex-sidebar"
          className={`ex-sidebar${filesOpen ? " open" : ""}`}
        >
          <div className="version-switch">
            <div className="version-switch-label">Tailwind version</div>
            <div className="version-pills" role="tablist">
              {(Object.keys(META) as Variant[]).map((key) => {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Variant is a single-member union today; the comparison must stay so the switcher keeps working when more variants are added
                const isActive = key === v;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`version-pill${isActive ? " active" : ""}`}
                    onClick={() => {
                      void navigate(`/examples/${key}`);
                    }}
                  >
                    <span>{META[key].label}</span>
                    {META[key].badge ? (
                      <span className="badge">{META[key].badge}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sidebar-scroll">
            <FileTree
              sections={EXAMPLE_FILES[v]}
              activePath={activePath}
              onOpen={openFile}
            />
          </div>

          <div className="sidebar-foot">
            <div className="row">
              <span>SOURCE</span>
              <span>examples/react-{v}</span>
            </div>
            <div className="row">
              <span>SHARED</span>
              <span>examples/design-system</span>
            </div>
            <div className="row">
              <span>BUNDLE</span>
              <span>{meta.bundler}</span>
            </div>
            <div className="row">
              <span>OPEN</span>
              <a
                href={`https://github.com/duydpdev/style-generator/tree/main/examples/react-${v}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                github ↗
              </a>
            </div>
          </div>
        </aside>

        <main className="ex-main">
          <div className="ex-toolbar">
            <button
              ref={filesToggleRef}
              type="button"
              className="icon-btn files-toggle"
              aria-label="Files"
              title="Files"
              aria-expanded={filesOpen}
              aria-controls="ex-sidebar"
              onClick={() => {
                setFilesOpen((open) => !open);
              }}
            >
              <svg className="ic" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M1.5 4a1 1 0 011-1h3l1.2 1.5h6.8a1 1 0 011 1V12a1 1 0 01-1 1h-11a1 1 0 01-1-1V4z" />
              </svg>
            </button>
            <div className="crumbs">
              <span className="pulse" />
              <span>examples</span>
              <span className="sep">/</span>
              <b>react-{v}</b>
              {activePath ? (
                <>
                  <span className="sep">/</span>
                  <span>{activePath.split("/").pop()}</span>
                </>
              ) : null}
            </div>
            <div className="view-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={view === "preview"}
                className={`view-tab${view === "preview" ? " active" : ""}`}
                onClick={() => {
                  setView("preview");
                }}
              >
                <svg className="ic" viewBox="0 0 16 16" aria-hidden="true">
                  <rect x="1.5" y="3" width="13" height="10" rx="1.5" />
                  <path d="M1.5 6h13" />
                </svg>
                <span>Preview</span>
                <span className="pill">live</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "code"}
                className={`view-tab${view === "code" ? " active" : ""}`}
                onClick={() => {
                  setView("code");
                }}
              >
                <svg className="ic" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M5.5 11.5L2 8l3.5-3.5M10.5 4.5L14 8l-3.5 3.5" />
                </svg>
                <span>Code</span>
                <span className="pill">{totalFiles} files</span>
              </button>
            </div>
            <div className="toolbar-actions">
              <a
                className="icon-btn"
                href={`${iframeSrc}?theme=${theme}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
              >
                <svg className="ic" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M9.5 2.5h4v4M13.5 2.5L7 9M7 3H3.5A1.5 1.5 0 002 4.5v8A1.5 1.5 0 003.5 14h8a1.5 1.5 0 001.5-1.5V9" />
                </svg>
              </a>
            </div>
          </div>

          <div className="workspace">
            <div
              className={`panel${view === "preview" ? " active" : ""}`}
              data-panel="preview"
            >
              <PreviewFrame
                src={iframeSrc}
                pathLabel={`/examples/${v}`}
                metaPrefix={`TW ${v}`}
                siteTheme={theme}
                title={`${meta.label} demo`}
              />
            </div>
            <div
              className={`panel${view === "code" ? " active" : ""}`}
              data-panel="code"
            >
              <CodeEditor
                openTabs={openTabs}
                activePath={activePath}
                onPick={setActivePath}
                onClose={closeTab}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
