import { describe, expect, it } from "vitest";

import { resolveOptions } from "../core/resolveOptions";
import type { ThemeConfig } from "../core/themeSchema";
import { DEFAULT_ROUNDED_VALUES } from "../shared/defaultOption";

import {
  coverageCost,
  groupId,
  selectorClass,
  splitSelectorList,
  stripGroupRules,
  suggestCoverage,
  themeClassGroups,
} from "./coverageCost";
import type { CoverageGroup } from "./coverageCost";

const theme: ThemeConfig = {
  colors: {
    primary: "#111",
    primaryHover: "#222",
    line: "#333",
    accentPurple: "#444",
    accentTeal: "#555",
    amber50: "#666",
    amber100: "#777",
    amber200: "#888",
  },
};
const groups = themeClassGroups(theme);
const inGroup =
  (id: string) =>
  (cls: string): boolean => {
    const g = groups.get(cls);
    return g !== undefined && groupId(g) === id;
  };
const ring = inGroup("colors/ring");

// Real selectors from a production Next build (phase 01 B1 spike), as `[selector, group]`.
const REAL_SELECTORS: [string, string][] = [
  ...[
    "accent-purple",
    "accent-teal",
    "amber-50",
    "amber-100",
    "amber-200",
  ].flatMap((k): [string, string][] => [
    [`.ring-${k}`, "colors/ring"],
    [`.outline-${k}`, "colors/outline"],
    [`:where(.divide-${k}>:not(:last-child))`, "colors/divide"],
    [`.placeholder-${k}::placeholder`, "colors/placeholder"],
  ]),
  [".ring-primary", "colors/ring"],
  [
    ":where(.hover\\:divide-primary-hover:hover>:not(:last-child))",
    "colors/divide",
  ],
  [".hover\\:border-line:hover", "colors/border"],
];

describe("groupId", () => {
  it("joins category and prefix, bare for a prefixless group", () => {
    expect(groupId({ category: "colors", prefix: "ring" })).toBe("colors/ring");
    expect(groupId({ category: "typography", prefix: "" })).toBe("typography");
  });
});

describe("themeClassGroups", () => {
  it("maps every real selector's class to its group", () => {
    for (const [selector, id] of REAL_SELECTORS) {
      const cls = selectorClass(selector);
      const g = cls === undefined ? undefined : groups.get(cls);
      expect(g && groupId(g), selector).toBe(id);
    }
  });

  it("kebab-cases keys across a letter-digit boundary", () => {
    expect(groups.get("ring-amber-50")).toEqual({
      category: "colors",
      prefix: "ring",
    });
    expect(groups.has("ring-amber50")).toBe(false);
  });

  it("falls back to the default keys when borderRadius and borderWidth are omitted", () => {
    const radius = DEFAULT_ROUNDED_VALUES[3];
    expect(groups.get(`rounded-${radius}`)).toEqual({
      category: "borderRadius",
      prefix: "rounded",
    });
    expect(groups.get("rounded-t-2xl")?.prefix).toBe("rounded-t");
    expect(groups.get("border-2")).toEqual({
      category: "borderWidth",
      prefix: "border",
    });
    expect(groups.get("divide-x-4")?.category).toBe("borderWidth");
  });

  it("uses the theme's own keys, not the defaults, when it declares the category", () => {
    const own = themeClassGroups({
      colors: { primary: "#111" },
      borderRadius: { pill: "9999px" },
      borderWidth: { thin: "1px" },
    });
    expect(own.get("rounded-pill")?.category).toBe("borderRadius");
    expect(own.has("rounded-md")).toBe(false);
    expect(own.get("border-thin")?.category).toBe("borderWidth");
    expect(own.has("border-2")).toBe(false);
  });

  it("maps typography to its bare kebab-cased key and the other categories to their prefix", () => {
    const g = themeClassGroups({
      colors: { primary: "#111" },
      typography: {
        text12Mono: {
          fontSize: "12px",
          lineHeight: "16px",
          fontWeight: 400,
        },
      },
      shadows: { soft: "0 1px 2px #000" },
      backdropBlurs: { glass: "8px" },
      fontFamily: { display: "serif" },
    });
    expect(g.get("text-12-mono")).toEqual({
      category: "typography",
      prefix: "",
    });
    expect(g.get("shadow-soft")?.category).toBe("shadows");
    expect(g.get("backdrop-blur-glass")?.prefix).toBe("backdrop-blur");
    expect(g.get("font-display")?.category).toBe("fontFamily");
  });

  it("does not map ring-2 (not a color key) or spacing utilities", () => {
    expect(groups.has("ring-2")).toBe(false);
    expect(groups.has("sp-4")).toBe(false);
  });
});

describe("selectorClass", () => {
  it.each([
    [".hover\\:ring-primary:hover", "ring-primary"],
    [".md\\:ring-primary", "ring-primary"],
    [".ring-primary\\/50", "ring-primary"],
    [".\\!ring-primary", "ring-primary"],
    [".ring-primary\\!", "ring-primary"],
    [".\\!md\\:hover\\:ring-primary\\/50", "ring-primary"],
    [".has-\\[\\.foo\\:bar\\]\\:ring-primary", "ring-primary"],
    [".placeholder-primary::placeholder", "placeholder-primary"],
    [":where(.divide-primary>:not(:last-child))", "divide-primary"],
  ])("%s -> %s", (selector, expected) => {
    expect(selectorClass(selector)).toBe(expected);
  });

  it("unescapes a hex escape and its single trailing space", () => {
    expect(selectorClass(".\\32 xl")).toBe("2xl");
    expect(selectorClass(".rounded-\\32 xl")).toBe("rounded-2xl");
    expect(selectorClass(".\\31 0\\:p-1")).toBe("p-1");
    expect(selectorClass(".a\\32  b")).toBe("a2");
  });

  it("skips a dot inside [...] and finds the next class", () => {
    expect(selectorClass('[data-x=".ring-primary"] .bg-primary')).toBe(
      "bg-primary",
    );
  });

  it("returns undefined for a selector without a class", () => {
    expect(selectorClass("&:hover")).toBeUndefined();
    expect(selectorClass(":root")).toBeUndefined();
    expect(selectorClass("")).toBeUndefined();
  });
});

describe("splitSelectorList", () => {
  it("splits on depth-0 commas only", () => {
    expect(splitSelectorList(".a,.b")).toEqual([".a", ".b"]);
    expect(splitSelectorList(":is(.a,.b)>.c,.d")).toEqual([
      ":is(.a,.b)>.c",
      ".d",
    ]);
    expect(splitSelectorList('[x="a,b"],.c')).toEqual(['[x="a,b"]', ".c"]);
    expect(splitSelectorList('.a:not(",")')).toEqual(['.a:not(",")']);
    expect(splitSelectorList(".a\\,b,.c")).toEqual([".a\\,b", ".c"]);
  });
});

describe("stripGroupRules", () => {
  it("strips a flat minified group and keeps the others; an emptied @media shell stays", () => {
    const css =
      "@layer utilities{.bg-primary{a:b}.ring-primary{c:d}@media (width>=48rem){.md\\:ring-primary{c:d}}}";
    expect(stripGroupRules(css, ring)).toEqual({
      css: "@layer utilities{.bg-primary{a:b}@media (width>=48rem){}}",
      removed: 2,
    });
  });

  it("keeps an @media that still holds a rule of another group", () => {
    const css =
      "@media (hover:hover){.hover\\:ring-primary:hover{a:b}.hover\\:bg-primary:hover{c:d}}";
    expect(stripGroupRules(css, ring)).toEqual({
      css: "@media (hover:hover){.hover\\:bg-primary:hover{c:d}}",
      removed: 1,
    });
  });

  it("leaves css untouched when nothing is a member", () => {
    const css = ".bg-primary{a:b}@media (width>=48rem){.md\\:bg-primary{c:d}}";
    expect(stripGroupRules(css, ring)).toEqual({ css, removed: 0 });
  });

  it("removes a nested member rule with everything nested in it, counting once", () => {
    const css =
      ".bg-primary{a:b}.ring-primary{c:d;&:hover{@media (hover:hover){e:f}}}";
    expect(stripGroupRules(css, ring)).toEqual({
      css: ".bg-primary{a:b}",
      removed: 1,
    });
  });

  it("descends into a kept rule and removes the nested member rules", () => {
    const css = ".card{color:red;& .ring-primary{a:b}&:hover{c:d}}";
    expect(stripGroupRules(css, ring)).toEqual({
      css: ".card{color:red;&:hover{c:d}}",
      removed: 1,
    });
  });

  it("strips the divide and placeholder shapes of their own group only", () => {
    const css =
      ":where(.divide-primary>:not(:last-child)){border-color:x}.placeholder-primary::placeholder{color:x}";
    expect(stripGroupRules(css, inGroup("colors/divide"))).toEqual({
      css: ".placeholder-primary::placeholder{color:x}",
      removed: 1,
    });
    expect(stripGroupRules(css, inGroup("colors/placeholder"))).toEqual({
      css: ":where(.divide-primary>:not(:last-child)){border-color:x}",
      removed: 1,
    });
  });

  it("strips variants, opacity steps and important of the group", () => {
    const css =
      ".hover\\:ring-primary:hover{a:b}.ring-primary\\/50{a:b}.\\!ring-primary{a:b}.bg-primary{a:b}";
    expect(stripGroupRules(css, ring)).toEqual({
      css: ".bg-primary{a:b}",
      removed: 3,
    });
  });

  it("keeps a rule whose selector list has a non-member selector", () => {
    const css = ".ring-primary,.ring-2{a:b}.ring-primary,.ring-line{c:d}";
    expect(stripGroupRules(css, ring)).toEqual({
      css: ".ring-primary,.ring-2{a:b}",
      removed: 1,
    });
    expect(ring("ring-2")).toBe(false);
  });

  it("is not thrown off by braces in comments and strings", () => {
    const css =
      '/* } */.ring-primary{content:"}";a:b}.bg-primary{content:"{";/* } */c:d}.ring-line{e:f}';
    expect(stripGroupRules(css, ring)).toEqual({
      css: '.bg-primary{content:"{";/* } */c:d}',
      removed: 2,
    });
  });

  it("copies @property, @keyframes and @font-face untouched", () => {
    const css =
      '@property --tw-ring-color{syntax:"*";inherits:false}@keyframes x{from{a:b}.ring-primary{c:d}}@font-face{font-family:x}.ring-primary{a:b}';
    expect(stripGroupRules(css, ring)).toEqual({
      css: css.slice(0, css.lastIndexOf(".ring-primary{a:b}")),
      removed: 1,
    });
  });

  it("keeps at-rules without a block and the text after them", () => {
    const css =
      "@charset 'utf-8';@layer a,b;.ring-primary{a:b}.bg-primary{c:d}";
    expect(stripGroupRules(css, ring)).toEqual({
      css: "@charset 'utf-8';@layer a,b;.bg-primary{c:d}",
      removed: 1,
    });
  });
});

describe("coverageCost", () => {
  // Incompressible filler so a group's gzip cost grows with its rule count.
  const filler = (n: number): string => {
    let seed = n * 7919 + 1;
    let out = "";
    for (let i = 0; i < 24; i++) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      out += seed.toString(36);
    }
    return out;
  };
  const rules = (cls: string, count: number): string =>
    Array.from({ length: count }, (_, i) => {
      const variant = i === 0 ? "" : `v${String(i)}\\:`;
      return `.${variant}${cls}{x:${filler(i)}}`;
    }).join("");
  const css = rules("ring-primary", 20) + rules("bg-primary", 4);

  it("sorts by bytes descending, counts rules and omits groups without a rule", () => {
    const out = coverageCost([{ file: "a.css", css }], groups);
    expect(out.map((r) => groupId(r.group))).toEqual([
      "colors/ring",
      "colors/bg",
    ]);
    expect(out.map((r) => r.rules)).toEqual([20, 4]);
    const [first, second] = out;
    expect(first?.bytes).toBeGreaterThan(second?.bytes ?? Infinity);
    expect(second?.bytes).toBeGreaterThan(0);
  });

  it("sums the cost over files", () => {
    const one = coverageCost([{ file: "a.css", css }], groups);
    const two = coverageCost(
      [
        { file: "a.css", css },
        { file: "b.css", css },
      ],
      groups,
    );
    expect(two.map((r) => r.rules)).toEqual([40, 8]);
    expect(two[0]?.bytes).toBe((one[0]?.bytes ?? 0) * 2);
  });

  it("breaks a bytes tie by group id", () => {
    const tie = new Map<string, CoverageGroup>([
      ["b-x", { category: "colors", prefix: "ring" }],
      ["a-x", { category: "colors", prefix: "bg" }],
    ]);
    const out = coverageCost(
      [{ file: "a.css", css: ".a-x{c:1}.b-x{c:1}" }],
      tie,
    );
    expect(out[0]?.bytes).toBe(out[1]?.bytes);
    expect(out.map((r) => groupId(r.group))).toEqual([
      "colors/bg",
      "colors/ring",
    ]);
  });

  it("returns nothing for CSS without a theme class", () => {
    expect(
      coverageCost([{ file: "a.css", css: ".card{a:b}" }], groups),
    ).toEqual([]);
  });
});

describe("suggestCoverage", () => {
  const ringGroup = { category: "colors", prefix: "ring" };
  const bgGroup = { category: "colors", prefix: "bg" };

  it("lists the remaining default prefixes", () => {
    expect(suggestCoverage(ringGroup, resolveOptions())).toBe(
      'coverage.colors.prefixes: ["bg","text","border","outline","divide","placeholder"]',
    );
  });

  it("removes the prefix from an explicit list", () => {
    expect(
      suggestCoverage(
        bgGroup,
        resolveOptions({ coverage: { colors: { prefixes: ["bg", "ring"] } } }),
      ),
    ).toBe('coverage.colors.prefixes: ["ring"]');
  });

  it("suggests false when the group is the last prefix", () => {
    expect(
      suggestCoverage(
        bgGroup,
        resolveOptions({ coverage: { colors: { prefixes: ["bg"] } } }),
      ),
    ).toBe("coverage.colors: false");
  });

  it("says the class is already out of coverage when its prefix is not listed", () => {
    expect(
      suggestCoverage(
        ringGroup,
        resolveOptions({ coverage: { colors: { prefixes: ["bg"] } } }),
      ),
    ).toBe("already out of coverage");
  });

  it("says the category is already false", () => {
    expect(
      suggestCoverage(bgGroup, resolveOptions({ coverage: { colors: false } })),
    ).toBe("coverage.colors is already false");
  });

  it("suggests false for a single-prefix and a bare-class category", () => {
    expect(
      suggestCoverage(
        { category: "shadows", prefix: "shadow" },
        resolveOptions(),
      ),
    ).toBe("coverage.shadows: false");
    expect(
      suggestCoverage({ category: "typography", prefix: "" }, resolveOptions()),
    ).toBe("coverage.typography: false");
  });

  it("keeps the other rounded prefixes when one is cut", () => {
    const out = suggestCoverage(
      { category: "borderRadius", prefix: "rounded-t" },
      resolveOptions(),
    );
    expect(out).toMatch(/^coverage\.borderRadius\.prefixes: \["rounded",/);
    expect(out).not.toContain('"rounded-t"');
    expect(out).toContain('"rounded-b"');
  });
});
