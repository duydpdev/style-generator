import { createVariantMapper } from "../src";

// Simulate tokens normally inferred from ThemeConfig
const colors = ["primary", "secondary", "danger", "success"] as const;
const sizes = ["sm", "md", "lg"] as const;

const bgVariants = createVariantMapper("bg", colors);
const textVariants = createVariantMapper("text", colors);
const shadowVariants = createVariantMapper("shadow", sizes);

console.log("Background Variants Map:", bgVariants);
console.log("Text Color Variants Map:", textVariants);
console.log("Shadow Variants Map:", shadowVariants);
