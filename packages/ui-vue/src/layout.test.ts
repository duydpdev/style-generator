import {
  createBoxRecipe,
  createCodeRecipe,
  createContainerRecipe,
  createGridRecipe,
  createLinkRecipe,
  createListRecipe,
  createStackRecipe,
  createTextRecipe,
  gridColumns,
} from "design-system-example/recipes";
import { presets, tokens } from "design-system-example";
import { describe, it } from "vitest";

import { expectRecipe, render, ui } from "../tests/ui";

describe("layout components render the design-system recipe classes", () => {
  it("Box", async () => {
    const props = { backgroundColor: "surface", rounded: "lg", shadow: "md" };
    expectRecipe(
      await render(ui.Box, props),
      createBoxRecipe(tokens, presets.box)(props),
    );
  });
  it("Flex", async () => {
    const props = { direction: "column", align: "center", justify: "between" };
    expectRecipe(
      await render(ui.Flex, { ...props, wrap: true }),
      createStackRecipe()({ ...props, wrap: true }),
    );
  });
  it("Stack defaults to a column", async () => {
    expectRecipe(
      await render(ui.Stack),
      createStackRecipe()({ direction: "column" }),
    );
  });
  it("Grid", async () => {
    const html = await render(ui.Grid, {
      columns: 2,
      align: "center",
      flow: "dense",
    });
    expectRecipe(
      html,
      createGridRecipe(tokens)({ align: "center", flow: "dense" }),
    );
    expectRecipe(html, gridColumns(2).className);
  });
  it("Container", async () => {
    expectRecipe(await render(ui.Container), createContainerRecipe()());
  });
  it("Text", async () => {
    const props = { type: "text14Regular", color: "muted" };
    expectRecipe(
      await render(ui.Text, props),
      createTextRecipe(tokens, presets.text)(props),
    );
  });
  it("Link", async () => {
    const props = { color: "primary", underline: "hover" };
    expectRecipe(await render(ui.Link, props), createLinkRecipe(tokens)(props));
  });
  it("List and ListItem", async () => {
    const props = { marker: "disc", position: "inside" };
    expectRecipe(await render(ui.List, props), createListRecipe()(props));
    expectRecipe(
      await render(ui.ListItem, { rounded: "md" }),
      createBoxRecipe(tokens)({ rounded: "md" }),
    );
  });
  it("Code", async () => {
    const props = { color: "muted" };
    expectRecipe(await render(ui.Code, props), createCodeRecipe(tokens)(props));
  });
});
