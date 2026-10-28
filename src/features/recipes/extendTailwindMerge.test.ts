import { extendTailwindMerge, twMerge as defaultTwMerge } from "tailwind-merge";
import type {
  ConfigExtension,
  DefaultClassGroupIds,
  DefaultThemeGroupIds,
} from "tailwind-merge";
import { describe, expect, expectTypeOf, it } from "vitest";

import { createDesignTokens } from "../tokens/createDesignTokens";
import {
  backDropBlursCategory,
  borderRadiusCategory,
  borderWidthCategory,
  shadowsCategory,
} from "../registry/builtInCategories";

import { createTailwindMergeExtension } from "./extendTailwindMerge";
import type {
  TailwindMergeExtension,
  TailwindMergeTokens,
} from "./extendTailwindMerge";

const theme = {
  colors: { primary: "#111", blue500: "#00f" },
  typography: {
    text10Light: {
      fontSize: "10px",
      lineHeight: "14px",
      fontWeight: 300,
    },
    heading1: { fontSize: "32px", lineHeight: "40px", fontWeight: 700 },
  },
  shadows: { card: "0 1px 2px #0003" },
  backDropBlurs: { glass: "12px" },
  borderRadius: { pill: "9999px" },
  borderWidth: { thin: "0.5px" },
} as const;

const tokens = createDesignTokens(theme).DesignTokens.Web;
const twMerge = extendTailwindMerge(createTailwindMergeExtension(tokens));

describe("createTailwindMergeExtension — real twMerge", () => {
  it.each([
    // the default twMerge misreads these as colors / unknown classes
    ["border-thin border-primary", "border-thin border-primary"],
    ["text-10-light text-primary", "text-10-light text-primary"],
    ["rounded-pill rounded-md", "rounded-md"],
    ["shadow-card shadow-lg", "shadow-lg"],
    // a shadow size and a shadow color are different groups: both survive
    ["shadow-card shadow-primary", "shadow-card shadow-primary"],
    ["shadow-primary shadow-card", "shadow-primary shadow-card"],
    ["backdrop-blur-glass backdrop-blur-md", "backdrop-blur-md"],
    // extension entries merge into the existing group instead of replacing it
    ["border-2 border-thin", "border-thin"],
    ["border-thin border-2", "border-2"],
    // modifiers are stripped before the group lookup
    ["md:rounded-t-pill md:rounded-t-lg", "md:rounded-t-lg"],
    ["hover:shadow-card shadow-lg", "hover:shadow-card shadow-lg"],
  ])("%s → %s", (input, expected) => {
    expect(twMerge(input)).toBe(expected);
  });

  it("is not what the default twMerge does for the same classes", () => {
    expect(defaultTwMerge("border-thin border-primary")).toBe("border-primary");
    expect(defaultTwMerge("text-10-light text-primary")).toBe("text-primary");
    expect(defaultTwMerge("shadow-card shadow-primary")).toBe("shadow-primary");
  });

  it.each([
    "border",
    "border-x",
    "border-y",
    "border-t",
    "border-r",
    "border-b",
    "border-l",
    "border-s",
    "border-e",
    "divide-x",
    "divide-y",
  ])(
    "%s-thin and %s-2 share one group (the id is a real tailwind-merge id)",
    (prefix) => {
      const merged = twMerge(`${prefix}-thin ${prefix}-2`);
      expect(merged).toBe(`${prefix}-2`);
    },
  );

  it.each([
    "rounded",
    "rounded-t",
    "rounded-r",
    "rounded-b",
    "rounded-l",
    "rounded-s",
    "rounded-e",
    "rounded-ss",
    "rounded-se",
    "rounded-ee",
    "rounded-es",
    "rounded-tl",
    "rounded-tr",
    "rounded-br",
    "rounded-bl",
  ])(
    "%s-pill and %s-lg share one group (side, logical and corner)",
    (prefix) => {
      expect(twMerge(`${prefix}-pill ${prefix}-lg`)).toBe(`${prefix}-lg`);
      expect(defaultTwMerge(`${prefix}-pill ${prefix}-lg`)).toBe(
        `${prefix}-pill ${prefix}-lg`,
      );
    },
  );

  it("a later side class refines an earlier whole-border class (default conflicts stay intact)", () => {
    expect(twMerge("border-thin border-t-2")).toBe("border-thin border-t-2");
    expect(twMerge("border-t-thin border-thin")).toBe("border-thin");
    expect(twMerge("rounded-t-pill rounded-pill")).toBe("rounded-pill");
  });

  it("typography: a later sg-typography class drops earlier font utilities", () => {
    expect(twMerge("text-sm text-10-light")).toBe("text-10-light");
    expect(twMerge("font-bold text-10-light")).toBe("text-10-light");
    expect(twMerge("leading-6 tracking-wide heading-1")).toBe("heading-1");
  });

  it("typography: a later single-property utility refines it (both kept)", () => {
    expect(twMerge("text-10-light font-bold")).toBe("text-10-light font-bold");
  });

  it("typography classes replace each other", () => {
    expect(twMerge("text-10-light heading-1")).toBe("heading-1");
  });

  it("leaves unrelated classes and duplicates of the defaults alone", () => {
    expect(twMerge("p-2 p-4 flex")).toBe("p-4 flex");
    expect(twMerge("bg-primary bg-blue-500")).toBe("bg-blue-500");
  });
});

describe("createTailwindMergeExtension — shape", () => {
  it("kebab-cases the camelCased token keys and never lists colors or font families", () => {
    const { classGroups } = createTailwindMergeExtension(tokens).extend;
    expect(classGroups["sg-typography"]).toEqual([
      "text-10-light",
      "heading-1",
    ]);
    expect(classGroups.shadow).toEqual([{ shadow: ["card"] }]);
    expect(classGroups["border-w-x"]).toEqual([{ "border-x": ["thin"] }]);
    expect(Object.keys(classGroups)).not.toContain("color");
    expect(Object.keys(classGroups)).not.toContain("font-family");
  });

  it("emits exactly the documented groups, the typography conflicts and the radius scale", () => {
    const ext = createTailwindMergeExtension(tokens).extend;
    expect(new Set(Object.keys(ext.classGroups))).toEqual(
      new Set([
        "backdrop-blur",
        "border-w",
        "border-w-b",
        "border-w-e",
        "border-w-l",
        "border-w-r",
        "border-w-s",
        "border-w-t",
        "border-w-x",
        "border-w-y",
        "divide-x",
        "divide-y",
        "sg-typography",
        "shadow",
      ]),
    );
    expect(ext.conflictingClassGroups).toEqual({
      "sg-typography": ["font-size", "font-weight", "leading", "tracking"],
    });
    expect(ext.theme).toEqual({ radius: ["pill"] });
  });

  it("emits no group, conflict or theme entry for an empty token list", () => {
    const empty: TailwindMergeTokens = {
      typography: [],
      shadows: [],
      backDropBlurs: [],
      borderRadius: [],
      borderWidth: [],
    };
    expect(createTailwindMergeExtension(empty)).toEqual({
      extend: { classGroups: {}, conflictingClassGroups: {}, theme: {} },
    });
  });

  it("an empty extension leaves twMerge behaving like the default", () => {
    const merge = extendTailwindMerge(
      createTailwindMergeExtension({
        typography: [],
        shadows: [],
        backDropBlurs: [],
        borderRadius: [],
        borderWidth: [],
      }),
    );
    expect(merge("p-2 p-4 border-thin border-primary")).toBe(
      "p-4 border-primary",
    );
  });
});

describe("local prefix table is pinned to the registry", () => {
  const prefixesOf = (key: keyof TailwindMergeTokens) => {
    const only: TailwindMergeTokens = {
      typography: [],
      shadows: [],
      backDropBlurs: [],
      borderRadius: [],
      borderWidth: [],
      [key]: ["probe"],
    };
    const { classGroups } = createTailwindMergeExtension(only).extend;
    return Object.values(classGroups).flatMap((entries) =>
      entries.flatMap((entry) =>
        typeof entry === "string" ? [] : Object.keys(entry),
      ),
    );
  };

  it("borderWidth prefixes equal borderWidthCategory.classPrefixes, in order", () => {
    expect(prefixesOf("borderWidth")).toEqual([
      ...borderWidthCategory.classPrefixes,
    ]);
  });

  it("shadow and backdrop-blur prefixes equal their categories'", () => {
    expect(prefixesOf("shadows")).toEqual([...shadowsCategory.classPrefixes]);
    expect(prefixesOf("backDropBlurs")).toEqual([
      ...backDropBlursCategory.classPrefixes,
    ]);
  });

  it("every borderRadius prefix the registry emits merges its pill with its lg (radius is a theme scale, not a class group)", () => {
    expect(prefixesOf("borderRadius")).toEqual([]);
    for (const prefix of borderRadiusCategory.classPrefixes) {
      expect(twMerge(`${prefix}-pill ${prefix}-lg`)).toBe(`${prefix}-lg`);
    }
  });

  it("border-width group ids are the tailwind-merge ids: border → border-w, divide-* unchanged", () => {
    const ids = Object.keys(
      createTailwindMergeExtension({
        typography: [],
        shadows: [],
        backDropBlurs: [],
        borderRadius: [],
        borderWidth: ["probe"],
      }).extend.classGroups,
    );
    expect(ids).toEqual([
      "border-w",
      "border-w-x",
      "border-w-y",
      "border-w-t",
      "border-w-r",
      "border-w-b",
      "border-w-l",
      "border-w-s",
      "border-w-e",
      "divide-x",
      "divide-y",
    ]);
  });
});

describe("types", () => {
  it("generate()/createDesignTokens() tokens are assignable to TailwindMergeTokens", () => {
    expectTypeOf(tokens).toExtend<TailwindMergeTokens>();
  });

  it("the structural extension fits tailwind-merge's own ConfigExtension", () => {
    expectTypeOf<TailwindMergeExtension>().toExtend<
      ConfigExtension<
        DefaultClassGroupIds | "sg-typography",
        DefaultThemeGroupIds
      >
    >();
  });
});
