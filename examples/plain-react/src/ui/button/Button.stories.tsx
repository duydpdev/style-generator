import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Button } from "./Button";
import { buttonIntents, buttonTables } from "./style";

type ButtonVariant = keyof typeof buttonTables.variants.variant;
type ButtonSize = keyof typeof buttonTables.variants.size;

const variants = Object.keys(buttonTables.variants.variant) as ButtonVariant[];
const sizes = Object.keys(buttonTables.variants.size) as ButtonSize[];

const meta = {
  title: "UI/Button",
  component: Button,
  args: { children: "Button" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default variant, intent and size; the play check proves the theme CSS reached the browser. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Button" });
    await expect(getComputedStyle(button).backgroundColor).not.toBe(
      "rgba(0, 0, 0, 0)",
    );
  },
};

/** Every variant × every intent (the compound classes). */
export const VariantsByIntent: Story = {
  render: () => (
    <div className="grid gap-3">
      {variants.map((variant) => (
        <div key={variant} className="flex flex-wrap gap-2">
          {buttonIntents.map((color) => (
            <Button key={color} variant={variant} color={color}>
              {variant} {color}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      {sizes.map((size) => (
        <Button key={size} size={size}>
          {size}
        </Button>
      ))}
    </div>
  ),
};

export const WithIcons: Story = { args: { prefix: "←", suffix: "→" } };

export const AsLink: Story = {
  render: () => (
    <Button as="a" href="#top" variant="link">
      Link
    </Button>
  ),
};
