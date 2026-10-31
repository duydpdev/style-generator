import type { ReactNode } from "react";

import { Box, Flex } from "../ui";

import { CodeBrackets, Preview } from "./icon";

export type ExamplesView = "preview" | "code";

interface TabProps {
  name: ExamplesView;
  view: ExamplesView;
  icon: ReactNode;
  label: string;
  pill: string;
  onView: (view: ExamplesView) => void;
}

function ViewTab({
  name,
  view,
  icon,
  label,
  pill,
  onView,
}: Readonly<TabProps>) {
  const active = view === name;
  return (
    <Flex
      as="button"
      type="button"
      role="tab"
      aria-selected={active}
      data-part={`view-tab${active ? " active" : ""}`}
      align="center"
      gap={1.5}
      py={1.5}
      px={3.5}
      backgroundColor={active ? "paper" : undefined}
      onClick={() => {
        onView(name);
      }}
    >
      {icon}
      <Box as="span">{label}</Box>
      <Box
        as="span"
        data-part="pill"
        px={1.25}
        py={0.25}
        mr={1.5}
        rounded="pill"
      >
        {pill}
      </Box>
    </Flex>
  );
}

interface Props {
  view: ExamplesView;
  totalFiles: number;
  onView: (view: ExamplesView) => void;
}

/**
 * Preview / Code switch of the examples toolbar.
 * @param root0 - Component props
 * @param root0.view - Active view
 * @param root0.totalFiles - Number of example files (pill of the Code tab)
 * @param root0.onView - Switches the view
 */
export function ExamplesViewTabs({
  view,
  totalFiles,
  onView,
}: Readonly<Props>) {
  return (
    <Flex data-part="view-tabs" role="tablist" p={0.75} rounded="md">
      <ViewTab
        name="preview"
        view={view}
        icon={<Preview />}
        label="Preview"
        pill="live"
        onView={onView}
      />
      <ViewTab
        name="code"
        view={view}
        icon={<CodeBrackets />}
        label="Code"
        pill={`${String(totalFiles)} files`}
        onView={onView}
      />
    </Flex>
  );
}
