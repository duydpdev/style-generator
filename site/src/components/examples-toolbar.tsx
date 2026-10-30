import type { RefObject } from "react";

import type { ThemeMode } from "../lib/use-theme";
import { Box, Flex } from "../ui";

import { External, Files } from "./icon";
import { ExamplesViewTabs, type ExamplesView } from "./examples-view-tabs";

interface Props {
  variant: string;
  activePath: string | null;
  view: ExamplesView;
  totalFiles: number;
  filesOpen: boolean;
  filesToggleRef: RefObject<HTMLButtonElement | null>;
  openHref: string;
  theme: ThemeMode;
  onView: (view: ExamplesView) => void;
  onToggleFiles: () => void;
}

/**
 * Toolbar of the examples shell: files toggle, breadcrumbs, view tabs, new-tab link.
 * @param root0 - Component props
 * @param root0.variant - Active example variant
 * @param root0.activePath - Path of the file shown in the editor
 * @param root0.view - Active view
 * @param root0.totalFiles - Number of example files
 * @param root0.filesOpen - Whether the file overlay is open
 * @param root0.filesToggleRef - Ref of the files toggle button
 * @param root0.openHref - Example URL without the theme query
 * @param root0.theme - Current site theme
 * @param root0.onView - Switches the view
 * @param root0.onToggleFiles - Opens or closes the file overlay
 */
export function ExamplesToolbar({
  variant,
  activePath,
  view,
  totalFiles,
  filesOpen,
  filesToggleRef,
  openHref,
  theme,
  onView,
  onToggleFiles,
}: Readonly<Props>) {
  return (
    <Flex
      data-part="ex-toolbar"
      height={52}
      align="center"
      justify="between"
      gap={{ base: 2, lg: 3 }}
      px={{ base: 3, lg: 5 }}
    >
      <Flex
        as="button"
        ref={filesToggleRef}
        type="button"
        data-part="icon-btn files-toggle"
        align="center"
        justify="center"
        aria-label="Files"
        title="Files"
        aria-expanded={filesOpen}
        aria-controls="ex-sidebar"
        onClick={onToggleFiles}
      >
        <Files />
      </Flex>
      <Flex data-part="crumbs" align="center" gap={2} minWidth={0}>
        <Box
          as="span"
          data-part="pulse"
          width={6}
          height={6}
          backgroundColor="success"
          mr={1}
        />
        <Box as="span">examples</Box>
        <Box as="span" data-part="sep">
          /
        </Box>
        <b>react-{variant}</b>
        {activePath ? (
          <>
            <Box as="span" data-part="sep">
              /
            </Box>
            <Box as="span">{activePath.split("/").pop()}</Box>
          </>
        ) : null}
      </Flex>
      <ExamplesViewTabs view={view} totalFiles={totalFiles} onView={onView} />
      <Flex align="center" gap={1.5}>
        <Flex
          as="a"
          data-part="icon-btn"
          align="center"
          justify="center"
          href={`${openHref}?theme=${theme}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in new tab"
        >
          <External />
        </Flex>
      </Flex>
    </Flex>
  );
}
