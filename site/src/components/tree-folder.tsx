import { useState } from "react";

import { Box, Flex, Stack } from "../ui";

import { FileDoc, Folder } from "./icon";

export interface TreeEntry {
  path: string;
  ext: string;
  name: string;
}

/** Extension groups that share one badge colour. */
const EXT_PARTS = [
  { exts: ["tsx", "jsx"], part: "s-ext s-ext-react" },
  { exts: ["ts", "js"], part: "s-ext s-ext-script" },
  { exts: ["css"], part: "s-ext s-ext-css" },
  { exts: ["json"], part: "s-ext s-ext-json" },
  { exts: ["html"], part: "s-ext s-ext-html" },
];

const extPart = (ext: string): string =>
  EXT_PARTS.find((e) => e.exts.includes(ext))?.part ?? "s-ext";

interface Props {
  folder: string;
  files: TreeEntry[];
  activePath: string | null;
  onOpen: (path: string) => void;
}

/**
 * One collapsible folder of the example file tree.
 * @param root0 - Component props
 * @param root0.folder - Folder label
 * @param root0.files - Files inside the folder
 * @param root0.activePath - Path of the file shown in the editor
 * @param root0.onOpen - Opens a file
 */
export function TreeFolder({
  folder,
  files,
  activePath,
  onOpen,
}: Readonly<Props>) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Flex
        as="button"
        type="button"
        className={`s-tree-folder${open ? " s-open" : ""}`}
        align="center"
        gap={1.5}
        py={1.5}
        px={2.5}
        rounded="md"
        width="100%"
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        <Box as="span" className="s-chev" width={8}>
          ▸
        </Box>
        <Folder />
        <Box as="span" className="s-folder-name">
          {folder}/
        </Box>
      </Flex>
      <Stack
        className={`s-tree-children${open ? "" : " s-collapsed"}`}
        ml={4.5}
      >
        {files.map((f) => (
          <Flex
            as="button"
            key={f.path}
            type="button"
            className={`s-tree-file${f.path === activePath ? " s-active" : ""}`}
            title={f.path}
            align="center"
            gap={2}
            py={1.25}
            pr={2.5}
            pl={3.5}
            ml={-0.25}
            position="relative"
            width="100%"
            onClick={() => {
              onOpen(f.path);
            }}
          >
            <FileDoc />
            <Box as="span" className="s-file-name">
              {f.name}
            </Box>
            <Box
              as="span"
              // eslint-disable-next-line no-restricted-syntax -- EXT_PARTS holds s- classes
              className={extPart(f.ext)}
              px={1.25}
              py={0.25}
            >
              {f.ext.toUpperCase()}
            </Box>
          </Flex>
        ))}
      </Stack>
    </>
  );
}
