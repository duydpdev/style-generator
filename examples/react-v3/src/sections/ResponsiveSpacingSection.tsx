import { Box } from "../components/Box";
import { Text } from "../components/Text";

import { SectionHead } from "./SectionHead";

const ROW_CLASS = "flex flex-wrap items-stretch border rounded-md bg-surface";

const ResponsiveTitle = ({ children }: { children: string }) => (
  <Text
    type="text12Mono"
    color="muted"
    className="mb-3 block uppercase tracking-wider"
  >
    {children}
  </Text>
);

const Caption = ({ children }: { children: string }) => (
  <Text type="text12Mono" color="muted" className="mt-2 block">
    {children}
  </Text>
);

export const ResponsiveSpacingSection = () => {
  return (
    <section className="border-t py-14">
      <SectionHead
        eyebrow="Responsive"
        title="Spacing reacts to breakpoints"
        description="Pass a ResponsiveValue object to spacing props. Each breakpoint key sets a CSS custom property; the plugin's fallback chain selects the right value at each viewport."
      />

      <div className="grid gap-8">
        <div>
          <ResponsiveTitle>{`p={{ base: 4, md: 8, lg: 12 }}`}</ResponsiveTitle>
          <Box className={ROW_CLASS} p={{ base: 4, md: 8, lg: 12 }}>
            <Box className="rounded-sm bg-primary/10 px-3 py-2">
              <Text type="text14Regular" color="primary">
                Padding scales with viewport
              </Text>
            </Box>
          </Box>
          <Caption>
            Resize browser: 4 → 8 → 12 at md (768px) and lg (1024px).
          </Caption>
        </div>

        <div>
          <ResponsiveTitle>{`gap={{ base: 2, md: 6 }}`}</ResponsiveTitle>
          <Box
            className="flex flex-wrap border rounded-md bg-surface p-4"
            gap={{ base: 2, md: 6 }}
          >
            {[1, 2, 3, 4].map((i) => (
              <Box key={i} className="rounded-sm bg-secondary/15 px-3 py-2">
                <Text type="text14Regular" color="secondary">
                  Item {i}
                </Text>
              </Box>
            ))}
          </Box>
          <Caption>Flex gap widens from 2 to 6 at md breakpoint.</Caption>
        </div>

        <div>
          <ResponsiveTitle>{`gapX={{ base: 2, md: 6 }}`}</ResponsiveTitle>
          <Box
            className="grid grid-cols-3 border rounded-md bg-surface p-4"
            gapX={{ base: 2, md: 6 }}
            gapY={2}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Box key={i} className="rounded-sm bg-success/15 px-3 py-2">
                <Text type="text14Regular" color="success">
                  Cell {i}
                </Text>
              </Box>
            ))}
          </Box>
          <Caption>Column gap responsive, row gap stays fixed at 2.</Caption>
        </div>
      </div>
    </section>
  );
};
