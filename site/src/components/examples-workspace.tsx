import type { ExampleFile } from "../lib/example-files";
import type { ThemeMode } from "../lib/use-theme";
import { Box, Stack } from "../ui";

import { CodeEditor } from "./code-editor";
import type { ExamplesView } from "./examples-view-tabs";
import { PreviewFrame } from "./preview-frame";

interface Props {
  view: ExamplesView;
  iframeSrc: string;
  pathLabel: string;
  metaPrefix: string;
  title: string;
  theme: ThemeMode;
  openTabs: ExampleFile[];
  activePath: string | null;
  onPick: (path: string) => void;
  onClose: (path: string) => void;
}

/**
 * Preview and code panels; both stay mounted, the active one is shown.
 * @param root0 - Component props
 * @param root0.view - Active view
 * @param root0.iframeSrc - URL of the example app
 * @param root0.pathLabel - Path shown in the preview address pill
 * @param root0.metaPrefix - Text before the theme in the preview title bar
 * @param root0.title - Title of the preview iframe
 * @param root0.theme - Current site theme
 * @param root0.openTabs - Files with an open code tab
 * @param root0.activePath - Path of the file shown in the editor
 * @param root0.onPick - Activates a code tab
 * @param root0.onClose - Closes a code tab
 */
export function ExamplesWorkspace({
  view,
  iframeSrc,
  pathLabel,
  metaPrefix,
  title,
  theme,
  openTabs,
  activePath,
  onPick,
  onClose,
}: Readonly<Props>) {
  const preview = view === "preview";
  return (
    <Box data-part="workspace" position="relative">
      <Stack
        data-part={`panel${preview ? " active" : ""}`}
        data-panel="preview"
        position="absolute"
      >
        <PreviewFrame
          src={iframeSrc}
          pathLabel={pathLabel}
          metaPrefix={metaPrefix}
          siteTheme={theme}
          title={title}
        />
      </Stack>
      <Stack
        data-part={`panel${preview ? "" : " active"}`}
        data-panel="code"
        position="absolute"
      >
        <CodeEditor
          openTabs={openTabs}
          activePath={activePath}
          onPick={onPick}
          onClose={onClose}
        />
      </Stack>
    </Box>
  );
}
