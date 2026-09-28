// Core types & helpers
export * from "./core";
export * from "./core/factories.index";

// Feature modules — public API only
export * from "./features/spacing/spacingHelpers";
export * from "./features/cva";

// Shared — only public-facing exports
export {
  DEFAULT_LAYOUT_CLASSES,
  DEFAULT_ROUNDED_VALUES,
  DEFAULT_BORDER_VALUES,
  DEFAULT_OPACITY_VALUES,
  DEFAULT_ZINDEX_VALUES,
  DEFAULT_SPACING_PROPERTIES,
} from "./shared/defaultOption";
export {
  roundedProperties,
  borderProperties,
} from "./shared/safelistProperties";
