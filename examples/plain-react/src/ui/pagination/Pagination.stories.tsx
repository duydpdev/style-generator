import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent } from "storybook/test";

import { Stack } from "../stack";

import { Pagination } from "./Pagination";

const meta = {
  title: "UI/Pagination",
  component: Pagination,
  args: { page: 5, pageCount: 10, onPageChange: fn(), size: "md" },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed `<property>` of a probe that reads a theme variable directly. */
const probe = (
  host: HTMLElement,
  property: "backgroundColor" | "height",
  value: string,
): string => {
  const span = host.ownerDocument.createElement("span");
  span.style.display = "block";
  span.style[property] = value;
  host.append(span);
  const computed = getComputedStyle(span)[property];
  span.remove();
  return computed;
};

/** The first, the last and one page on each side of the current one, with an ellipsis for each longer gap; a click asks for that page. */
export const Default: Story = {
  play: async ({ args, canvas, canvasElement }) => {
    const nav = canvas.getByRole("navigation", { name: "Pagination" });
    const pages = canvas
      .getAllByRole("button", { name: /^Page / })
      .map((button) => button.textContent);
    await expect(pages).toEqual(["1", "4", "5", "6", "10"]);
    await expect(nav.querySelectorAll("li[aria-hidden]")).toHaveLength(2);
    const current = canvas.getByRole("button", { name: "Page 5" });
    await expect(current).toHaveAttribute("aria-current", "page");
    await expect(getComputedStyle(current).backgroundColor).toBe(
      probe(canvasElement, "backgroundColor", "var(--sg-color-primary)"),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Page 6" }));
    await expect(args.onPageChange).toHaveBeenCalledWith(6);
    await userEvent.click(canvas.getByRole("button", { name: "Next" }));
    await expect(args.onPageChange).toHaveBeenLastCalledWith(6);
  },
};

/** A page that is not a number (`?page=abc`) shows page 1 as current, never "Page NaN". */
export const NotANumber: Story = {
  args: { page: Number.NaN, pageCount: 3 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Page 1" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      canvas.getByRole("button", { name: "Previous" }),
    ).toBeDisabled();
  },
};

/** `siblings={Infinity}` shows every page, with no ellipsis. */
export const AllPages: Story = {
  args: { siblings: Number.POSITIVE_INFINITY, pageCount: 7 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getAllByRole("button", { name: /^Page / }),
    ).toHaveLength(7);
  },
};

/** On the first page Previous is disabled; a gap of one page shows that page instead of an ellipsis. */
export const FirstPage: Story = {
  args: { page: 1, pageCount: 4 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Previous" }),
    ).toBeDisabled();
    await expect(
      canvas
        .getAllByRole("button", { name: /^Page / })
        .map((button) => button.textContent),
    ).toEqual(["1", "2", "3", "4"]);
  },
};

export const Small: Story = { args: { size: "sm" } };
export const Medium: Story = { args: { size: "md" } };
export const Large: Story = { args: { size: "lg" } };

/** Each size's buttons are their `controlHeight` token tall. */
export const Sizes: Story = {
  render: (args) => (
    <Stack gap={4}>
      {(["sm", "md", "lg"] as const).map((size) => (
        <Pagination key={size} {...args} size={size} aria-label={size} />
      ))}
    </Stack>
  ),
  play: async ({ canvas, canvasElement }) => {
    for (const size of ["sm", "md", "lg"] as const) {
      const nav = canvas.getByRole("navigation", { name: size });
      const button = nav.querySelector("button");
      if (button === null) throw new Error("no button");
      await expect(getComputedStyle(button).height).toBe(
        probe(canvasElement, "height", `var(--sg-control-${size})`),
      );
    }
  },
};
