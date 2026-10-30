import { Box, Flex } from "../ui";

const LANG_LABEL: Record<string, string> = {
  ts: "TypeScript JSX",
  css: "CSS",
  json: "JSON",
  text: "Plain Text",
};

interface Props {
  path: string | undefined;
  lang: string | undefined;
  lineCount: number;
}

/**
 * Status bar under the code editor: branch, path, encoding, language, lines.
 * @param root0 - Component props
 * @param root0.path - Path of the open file
 * @param root0.lang - Language id of the open file
 * @param root0.lineCount - Number of lines of the open file
 */
export function CodeStatusbar({ path, lang, lineCount }: Readonly<Props>) {
  return (
    <Flex
      data-part="code-statusbar"
      height={28}
      align="center"
      justify="between"
      gap={3.5}
      px={3.5}
    >
      <Flex data-part="statusbar-left" gap={3.5} minWidth={0}>
        <Box as="span" data-part="git-branch">
          ⎇ main
        </Box>
        <Box as="span">{path ?? "—"}</Box>
      </Flex>
      <Flex data-part="statusbar-right" gap={3.5}>
        <Box as="span">
          <b>UTF-8</b>
        </Box>
        <Box as="span">
          <b>{lang ? (LANG_LABEL[lang] ?? "Plain") : "—"}</b>
        </Box>
        <Box as="span">
          {lineCount > 0 ? `${String(lineCount)} lines` : "0 lines"}
        </Box>
      </Flex>
    </Flex>
  );
}
