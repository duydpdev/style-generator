import type { Meta, StoryObj } from "@storybook/react";
import { axisAttributes } from "design-system-example";
import { useEffect, type ReactNode } from "react";
import { expect } from "storybook/test";

import { ColorSection } from "./ColorSection";
import type { PaletteId, ThemeName } from "./types";

/** Sets the `theme`/`palette` axis attributes on `<html>` for one story (the swatches read the CSS variables they switch) and removes them on exit. */
const AxesScope = ({
  palette,
  theme,
  children,
}: {
  palette: PaletteId;
  theme: ThemeName;
  children: ReactNode;
}) => {
  useEffect(() => {
    const root = document.documentElement;
    const axes = axisAttributes({ theme, palette });
    for (const [name, value] of Object.entries(axes)) {
      root.setAttribute(name, value);
    }
    return () => {
      for (const name of Object.keys(axes)) root.removeAttribute(name);
    };
  }, [palette, theme]);
  return <>{children}</>;
};

const meta = {
  title: "Sections/ColorSection",
  component: ColorSection,
  parameters: { layout: "fullscreen" },
  args: { palette: "base", theme: "base" },
  decorators: [
    (Story, { args }) => (
      <AxesScope palette={args.palette} theme={args.theme}>
        <Story />
      </AxesScope>
    ),
  ],
} satisfies Meta<typeof ColorSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("--color-primary")).toBeInTheDocument();
    await expect(canvas.getAllByText(/^--color-[a-z]+$/)).toHaveLength(8);
  },
};

export const Forest: Story = { args: { palette: "forest" } };
export const Sunset: Story = { args: { palette: "sunset" } };
export const Mono: Story = { args: { palette: "mono" } };

export const Dark: Story = { args: { theme: "dark" } };
export const HighContrast: Story = { args: { theme: "highContrast" } };
