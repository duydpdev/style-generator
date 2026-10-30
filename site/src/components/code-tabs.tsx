import type { ExampleFile } from "../lib/example-files";
import { Box, Flex } from "../ui";

interface Props {
  openTabs: ExampleFile[];
  activePath: string | null;
  onPick: (path: string) => void;
  onClose: (path: string) => void;
}

/**
 * Open-file tab strip of the code editor.
 * @param root0 - Component props
 * @param root0.openTabs - Files with an open tab
 * @param root0.activePath - Path of the active tab
 * @param root0.onPick - Activates a tab
 * @param root0.onClose - Closes a tab
 */
export function CodeTabs({
  openTabs,
  activePath,
  onPick,
  onClose,
}: Readonly<Props>) {
  return (
    <Flex data-part="code-tabs">
      {openTabs.map((t) => {
        const name = t.path.split("/").pop();
        return (
          <Flex
            key={t.path}
            data-part={`code-tab${t.path === activePath ? " active" : ""}`}
            align="center"
            gap={0.5}
            position="relative"
          >
            <Box
              as="button"
              type="button"
              data-part="code-tab-pick"
              py={2.75}
              pl={4}
              onClick={() => {
                onPick(t.path);
              }}
            >
              {name}
            </Box>
            <Box
              as="button"
              type="button"
              data-part="code-tab-close"
              ml={0.5}
              mr={3}
              px={1}
              py={0.25}
              aria-label={`Close ${name ?? t.path}`}
              onClick={() => {
                onClose(t.path);
              }}
            >
              ×
            </Box>
          </Flex>
        );
      })}
    </Flex>
  );
}
