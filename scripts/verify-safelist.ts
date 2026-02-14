import { createStylePlugin } from "../src";
import { ThemeConfig } from "../src/types";

const mockConfig: ThemeConfig = {
  colors: {
    base: { white: "#fff" },
    text: { primary: "#333" },
  },
  typography: {
    h1: {
      fontSize: "32px",
      lineHeight: "1.2",
      fontWeight: 700,
      letterSpacing: "0px",
    },
  },
  shadows: { sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" },
  borderRadius: { md: "0.375rem" },
};

console.log("🔍 Testing createStylePlugin...");

interface TailwindPlugin {
  handler: (...args: unknown[]) => unknown;
  config?: {
    safelist?: string[];
    theme?: Record<string, unknown>;
  };
}

try {
  // 1. Create the plugin instance
  const pluginInstance = createStylePlugin(mockConfig) as TailwindPlugin;

  console.log("✅ Plugin created successfully");

  // 2. Mock a Tailwind config to see what the plugin adds
  if (pluginInstance.config) {
    console.log("✅ Plugin has a config object");

    const safelist = pluginInstance.config.safelist;

    if (Array.isArray(safelist) && safelist.length > 0) {
      console.log(
        `✅ Safelist generated with ${safelist.length.toString()} classes.`,
      );
      console.log("Sample safelist classes:", safelist.slice(0, 5));

      // Verify a specific expected class exists
      const expectedClass = "text-primary";
      if (safelist.includes(expectedClass)) {
        console.log(`✅ Found expected class: ${expectedClass}`);
      } else {
        console.warn(
          `⚠️ Could not find expected class ${expectedClass} in safelist.`,
        );
      }
    } else {
      console.error("❌ Safelist is empty or not an array");
    }
  } else {
    console.log(
      "ℹ️ Plugin does not expose a raw config object directly (standard Tailwind behavior).",
    );
  }
} catch (error) {
  console.error("❌ Error running verification:", error);
  process.exit(1);
}
