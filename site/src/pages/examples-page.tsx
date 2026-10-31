import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { ExamplesSidebar } from "../components/examples-sidebar";
import { ExamplesToolbar } from "../components/examples-toolbar";
import type { ExamplesView } from "../components/examples-view-tabs";
import { ExamplesWorkspace } from "../components/examples-workspace";
import { Topbar } from "../components/topbar";
import {
  fileCount,
  findFile,
  flatFiles,
  type ExampleFile,
} from "../lib/example-files";
import { META } from "../lib/examples-meta";
import { useFilesOverlay } from "../lib/use-files-overlay";
import { useTheme } from "../lib/use-theme";
import { Box, Grid, Stack } from "../ui";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** File opened first: the app entry, not the alphabetically first sibling. */
const DEFAULT_FILE = "src/App.tsx";

type View = ExamplesView;

export function ExamplesPage() {
  const { variant } = useParams<{ variant?: string }>();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const [view, setView] = useState<View>("preview");
  const [openTabs, setOpenTabs] = useState<ExampleFile[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const { filesOpen, setFilesOpen, filesToggleRef } = useFilesOverlay();

  useEffect(() => {
    document.body.classList.add("examples-mode");
    return () => {
      document.body.classList.remove("examples-mode");
    };
  }, []);

  // Bootstrap / reset tabs whenever the variant changes
  useEffect(() => {
    if (variant !== "v4") return;
    const files = flatFiles(variant);
    const first = files.find((f) => f.path === DEFAULT_FILE) ?? files.at(0);
    setOpenTabs(first ? [first] : []);
    setActivePath(first ? first.path : null);
    setView("preview");
  }, [variant]);

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

      <Grid data-part="ex-shell" position="relative" minHeight={0}>
        <Box
          as="button"
          type="button"
          data-part={`ex-backdrop${filesOpen ? " open" : ""}`}
          aria-label="Close file tree"
          tabIndex={-1}
          onClick={() => {
            setFilesOpen(false);
          }}
        />
        <ExamplesSidebar
          variant={v}
          open={filesOpen}
          activePath={activePath}
          onOpen={openFile}
          onSelectVariant={(key) => {
            void navigate(`/examples/${key}`);
          }}
        />

        <Stack as="main" data-part="ex-main" minWidth={0}>
          <ExamplesToolbar
            variant={v}
            activePath={activePath}
            view={view}
            totalFiles={totalFiles}
            filesOpen={filesOpen}
            filesToggleRef={filesToggleRef}
            openHref={iframeSrc}
            theme={theme}
            onView={setView}
            onToggleFiles={() => {
              setFilesOpen((open) => !open);
            }}
          />
          <ExamplesWorkspace
            view={view}
            iframeSrc={iframeSrc}
            pathLabel={`/examples/${v}`}
            metaPrefix={`TW ${v}`}
            title={`${meta.label} demo`}
            theme={theme}
            openTabs={openTabs}
            activePath={activePath}
            onPick={setActivePath}
            onClose={closeTab}
          />
        </Stack>
      </Grid>
    </>
  );
}
