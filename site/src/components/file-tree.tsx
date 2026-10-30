import type { ExampleSection } from "../lib/example-files";
import { Box, Flex } from "../ui";

import { TreeFolder, type TreeEntry } from "./tree-folder";

interface Props {
  sections: ExampleSection[];
  activePath: string | null;
  onOpen: (path: string) => void;
}

function fileNameOf(path: string): string {
  return path.split("/").pop() ?? path;
}

function extOf(name: string): string {
  return name.includes(".") ? (name.split(".").pop() ?? "") : "";
}

function folderOf(path: string): string {
  const parts = path.split("/");
  return parts.length > 1 ? parts.slice(0, -1).join("/") : "(root)";
}

/**
 * The example file explorer: one section per group, one folder per directory.
 * @param root0 - Component props
 * @param root0.sections - Example files grouped by section
 * @param root0.activePath - Path of the file shown in the editor
 * @param root0.onOpen - Opens a file
 */
export function FileTree({ sections, activePath, onOpen }: Readonly<Props>) {
  return (
    <>
      {sections.map((sec) => {
        const byFolder = new Map<string, TreeEntry[]>();
        for (const f of sec.files) {
          const folder = folderOf(f.path);
          const name = fileNameOf(f.path);
          const entry = { path: f.path, ext: extOf(name), name };
          const list = byFolder.get(folder);
          if (list) list.push(entry);
          else byFolder.set(folder, [entry]);
        }
        return (
          <Box key={sec.section} mb={1.5}>
            <Flex
              data-part="tree-heading"
              align="center"
              gap={2}
              pt={2.5}
              px={2.5}
              pb={1.5}
            >
              <Box as="span">{sec.section}</Box>
              <Box
                as="span"
                data-part="tree-count"
                px={1.5}
                py={0.25}
                rounded="pill"
              >
                {sec.files.length}
              </Box>
            </Flex>
            {Array.from(byFolder.entries()).map(([folder, files]) => (
              <TreeFolder
                key={folder}
                folder={folder}
                files={files}
                activePath={activePath}
                onOpen={onOpen}
              />
            ))}
          </Box>
        );
      })}
    </>
  );
}
