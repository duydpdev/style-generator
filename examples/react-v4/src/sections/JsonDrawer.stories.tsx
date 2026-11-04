import type { Meta, StoryObj } from "@storybook/react";
import { useState, type ComponentProps } from "react";
import { expect, fn, userEvent } from "storybook/test";

import { Button } from "../ui";

import { JsonDrawer } from "./JsonDrawer";

const meta = {
  title: "Sections/JsonDrawer",
  component: JsonDrawer,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    onClose: fn(),
    palette: "base",
  },
} satisfies Meta<typeof JsonDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A host that owns `open`, the way `App` does. */
const Host = (props: ComponentProps<typeof JsonDrawer>) => {
  const [open, setOpen] = useState(props.open);
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Open theme.json
      </Button>
      <JsonDrawer
        {...props}
        open={open}
        onClose={() => {
          props.onClose();
          setOpen(false);
        }}
      />
    </>
  );
};

export const Open: Story = {
  play: async ({ args, canvas, canvasElement }) => {
    await expect(canvas.getByRole("complementary")).toHaveAttribute(
      "data-open",
      "true",
    );
    await expect(canvasElement.querySelector("pre")).toHaveTextContent(
      '"colors"',
    );
    await userEvent.click(canvas.getByRole("button", { name: "Close" }));
    await expect(args.onClose).toHaveBeenCalledTimes(1);
  },
};

export const Closed: Story = {
  args: { open: false },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("aside")).toHaveAttribute(
      "data-open",
      "false",
    );
  },
};

/** Opening and closing through the host: `data-open` flips and `onClose` is called once. */
export const OpensAndCloses: Story = {
  args: { open: false },
  render: (args) => <Host {...args} />,
  play: async ({ args, canvas, canvasElement }) => {
    const panel = canvasElement.querySelector("aside");
    await expect(panel).toHaveAttribute("data-open", "false");
    await userEvent.click(
      canvas.getByRole("button", { name: "Open theme.json" }),
    );
    await expect(panel).toHaveAttribute("data-open", "true");
    await userEvent.click(canvas.getByRole("button", { name: "Close" }));
    await expect(args.onClose).toHaveBeenCalledTimes(1);
    await expect(panel).toHaveAttribute("data-open", "false");
  },
};

export const Forest: Story = { args: { palette: "forest" } };
export const Sunset: Story = { args: { palette: "sunset" } };
export const Mono: Story = { args: { palette: "mono" } };
