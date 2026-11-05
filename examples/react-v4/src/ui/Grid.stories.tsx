import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Box, Grid } from "../ui";

const ITEM = { backgroundColor: "surface", rounded: "sm", p: 2 } as const;
const items = ["One", "Two", "Three", "Four", "Five", "Six"].map((label) => (
  <Box key={label} {...ITEM}>
    {label}
  </Box>
));

const meta = {
  title: "UI/Grid",
  component: Grid,
  args: { gap: 2, columns: 3, children: items },
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { columns: 3 } };
export const ResponsiveColumns: Story = {
  args: { columns: { base: 1, md: 2, lg: 3 } },
};
export const TrackList: Story = { args: { columns: "80px 1fr 80px" } };

export const AlignStart: Story = { args: { align: "start", minHeight: 160 } };
export const AlignCenter: Story = { args: { align: "center", minHeight: 160 } };
export const AlignEnd: Story = { args: { align: "end", minHeight: 160 } };
export const AlignStretch: Story = {
  args: { align: "stretch", minHeight: 160 },
};

export const JustifyStart: Story = {
  args: { justify: "start", columns: "80px 80px 80px" },
};
export const JustifyCenter: Story = {
  args: { justify: "center", columns: "80px 80px 80px" },
};
export const JustifyEnd: Story = {
  args: { justify: "end", columns: "80px 80px 80px" },
};
export const JustifyBetween: Story = {
  args: { justify: "between", columns: "80px 80px 80px" },
};

export const FlowRow: Story = { args: { flow: "row" } };
export const FlowColumn: Story = { args: { flow: "column" } };
export const FlowDense: Story = { args: { flow: "dense" } };

const ROWS = [1, 2, 3, 4, 5, 6, "none"] as const;

/** `rows`: one labelled Grid per value; the computed track list has `n` tracks. The "none" tile has no items: CSSOM resolves `grid-template-rows` to the used track list (implicit rows included), so `none` is only observable on an empty grid. */
export const RowValues: Story = {
  render: () => (
    <Grid gap={2} columns={4}>
      {ROWS.map((value) => (
        <Grid
          key={String(value)}
          columns={2}
          rows={value}
          height={120}
          aria-label={`rows=${String(value)}`}
        >
          {value === "none" ? null : (
            <>
              <Box {...ITEM}>A</Box>
              <Box {...ITEM}>B</Box>
            </>
          )}
        </Grid>
      ))}
    </Grid>
  ),
  play: async ({ canvas }) => {
    for (const value of ROWS) {
      const el = canvas.getByLabelText(`rows=${String(value)}`);
      const rows = getComputedStyle(el).gridTemplateRows;
      if (value === "none") {
        await expect(rows).toBe("none");
      } else {
        await expect(rows.trim().split(/\s+/).length).toBe(value);
      }
    }
  },
};
