import {
  createStyleSystem,
  defineTheme,
  defineOptions,
  Breakpoint,
} from "@duydpdev/style-generator";

import themeJson from "./theme.json";

const theme = defineTheme(themeJson);
const options = defineOptions({
  tailwindVersion: 4,
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
  safelistColors: true,
});

const { plugin } = createStyleSystem(theme, options);

export default plugin;
