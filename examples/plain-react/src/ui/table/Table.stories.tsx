import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Table } from "./Table";

const meta = {
  title: "UI/Table",
  component: Table,
  args: {
    caption: "Invoices",
    columns: [
      { key: "id", header: "Invoice" },
      { key: "status", header: "Status" },
      { key: "amount", header: "Amount", align: "end" },
    ],
    rows: [
      { id: "INV-001", status: "Paid", amount: "$250.00" },
      { id: "INV-002", status: "Pending", amount: "$1,040.00" },
    ],
    rowKey: (row, index) => (typeof row.id === "string" ? row.id : index),
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed `color` of a probe that reads a theme variable directly. */
const probe = (host: HTMLElement, value: string): string => {
  const span = host.ownerDocument.createElement("span");
  span.style.color = value;
  host.append(span);
  const computed = getComputedStyle(span).color;
  span.remove();
  return computed;
};

/** Named by its caption, `scope="col"` headers in `muted`, one row per item; an `end` column aligns right. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const table = canvas.getByRole("table", { name: "Invoices" });
    await expect(table).toBeVisible();
    const headers = canvas.getAllByRole("columnheader");
    await expect(headers.map((header) => header.textContent)).toEqual([
      "Invoice",
      "Status",
      "Amount",
    ]);
    await expect(
      getComputedStyle(canvas.getByRole("columnheader", { name: "Invoice" }))
        .color,
    ).toBe(probe(canvasElement, "var(--sg-color-muted)"));
    await expect(canvas.getAllByRole("row")).toHaveLength(3);
    await expect(getComputedStyle(canvas.getByText("$250.00")).textAlign).toBe(
      "end",
    );
    await expect(getComputedStyle(canvas.getByText("Paid")).textAlign).toBe(
      "start",
    );
  },
};

/** Without `caption`, `aria-label` names the table. */
export const NoCaption: Story = {
  args: { caption: undefined, "aria-label": "Invoices" },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.querySelector("caption")).toBeNull();
    await expect(canvas.getByRole("table", { name: "Invoices" })).toBeVisible();
  },
};
