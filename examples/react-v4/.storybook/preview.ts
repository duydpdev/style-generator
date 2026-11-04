import type { Preview } from "@storybook/react";

import "../src/index.css";

/** Global CSS only: Tailwind + the generated theme (`yarn generate`); every story gets an autodocs page. */
const preview: Preview = { tags: ["autodocs"] };

export default preview;
