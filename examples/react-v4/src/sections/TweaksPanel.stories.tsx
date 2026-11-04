import type { Meta, StoryObj } from "@storybook/react";
import { useState, type ComponentProps } from "react";
import { expect, fn, userEvent } from "storybook/test";

import { Button } from "../ui";

import { TweaksPanel } from "./TweaksPanel";

const meta = {
  title: "Sections/TweaksPanel",
  component: TweaksPanel,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    onClose: fn(),
    onReset: fn(),
    setTweak: fn(),
    state: {
      palette: "base",
      theme: "base",
      voice: "editorial",
      geometry: "soft",
      surface: "lifted",
    },
  },
} satisfies Meta<typeof TweaksPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A host that owns `open`, the way `App` does. */
const Host = (props: ComponentProps<typeof TweaksPanel>) => {
  const [open, setOpen] = useState(props.open);
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Open tweaks
      </Button>
      <TweaksPanel
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
    await userEvent.click(canvas.getByRole("button", { name: "Reset" }));
    await expect(args.onReset).toHaveBeenCalledTimes(1);
    await userEvent.click(canvas.getByRole("button", { name: /Sharp/ }));
    await expect(args.setTweak).toHaveBeenCalledWith("geometry", "sharp");
    await expect(canvasElement.querySelector("aside")).not.toBeNull();
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
    await userEvent.click(canvas.getByRole("button", { name: "Open tweaks" }));
    await expect(panel).toHaveAttribute("data-open", "true");
    await userEvent.click(canvas.getByRole("button", { name: "×" }));
    await expect(args.onClose).toHaveBeenCalledTimes(1);
    await expect(panel).toHaveAttribute("data-open", "false");
  },
};
