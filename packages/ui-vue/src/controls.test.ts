import {
  createBadgeRecipe,
  createButtonRecipe,
  createCardRecipe,
  createDialogOverlayRecipe,
  createDialogRecipe,
  createInputRecipe,
  createSelectRecipe,
} from "design-system-example/recipes";
import { presets, tokens } from "design-system-example";
import { describe, expect, it } from "vitest";

import { expectRecipe, render, renderSlots, ui } from "../tests/ui";

describe("control components render the design-system recipe classes", () => {
  it("Button", async () => {
    const props = { variant: "outline", color: "danger", size: "sm" };
    expectRecipe(
      await render(ui.Button, props),
      createButtonRecipe(tokens, presets.button)(props),
    );
  });
  it("Card", async () => {
    const props = { tone: "outline", padding: "lg" };
    expectRecipe(
      await render(ui.Card, props),
      createCardRecipe(tokens, presets.card)(props),
    );
  });
  it("Badge", async () => {
    const props = { color: "success", variant: "soft" };
    expectRecipe(
      await render(ui.Badge, props),
      createBadgeRecipe(tokens, presets.badge)(props),
    );
  });
  it("Input", async () => {
    const props = { size: "md", invalid: true };
    const html = await render(ui.Input, props);
    expectRecipe(html, createInputRecipe(tokens, presets.input)(props));
    expect(html).toContain('aria-invalid="true"');
  });
  it("Select", async () => {
    expectRecipe(
      await render(ui.Select, { size: "sm" }),
      createSelectRecipe(tokens, presets.select)({ size: "sm" }),
    );
  });
  it("Dialog", async () => {
    const html = await render(ui.Dialog, { open: true, size: "sm" });
    expectRecipe(
      html,
      createDialogRecipe(tokens, presets.dialog)({ size: "sm" }),
    );
    expectRecipe(html, createDialogOverlayRecipe(tokens, presets.dialog)({}));
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
  });
  it("Button renders the prefix and suffix slots around the label", async () => {
    const html = await renderSlots(ui.Button, {
      default: () => "Go",
      prefix: () => "P",
      suffix: () => "S",
    });
    expect(html).toContain('type="button"');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain('<span data-icon="start">P</span>');
    expect(html).toContain("<span>Go</span>");
    expect(html).toContain('<span data-icon="end">S</span>');
    expect(await render(ui.Button, { as: "a", href: "/x" })).not.toContain(
      "type=",
    );
  });
  it("Dialog renders nothing while closed", async () => {
    expect(await render(ui.Dialog, { open: false })).not.toContain("dialog");
  });
  it("Input and Select bind modelValue", async () => {
    expect(await render(ui.Input, { modelValue: "hello" })).toContain(
      'value="hello"',
    );
    expect(await render(ui.Select, { modelValue: "b" })).toContain('value="b"');
  });
});
