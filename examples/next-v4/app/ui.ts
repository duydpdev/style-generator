"use client";

import { createUi } from "@duydpdev/ui-react";
import { presets, tokens } from "design-system-example";

/** One createUi call; next-v4 renders every role, so it passes all 8 presets. */
const ui = createUi(tokens, presets);

export const Box = ui.Box;
export const Flex = ui.Flex;
export const Stack = ui.Stack;
export const Grid = ui.Grid;
export const Container = ui.Container;
export const Text = ui.Text;
export const Button = ui.Button;
export const Card = ui.Card;
export const Badge = ui.Badge;
export const Input = ui.Input;
export const Select = ui.Select;
export const Dialog = ui.Dialog;
