import type { JSX } from "react";

import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Grid } from "../ui/grid";
import { Text } from "../ui/text";

import { FEATURES } from "./content";
import { Section } from "./Section";
import { SectionHead } from "./SectionHead";

/** Six feature cards in a responsive grid. */
export function Features(): JSX.Element {
  return (
    <Section id="features">
      <SectionHead
        eyebrow="Features"
        title="Everything comes from the theme"
        lede="Change one token and every utility, type and component follows."
      />
      <Grid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
        {FEATURES.map((feature) => (
          <Card key={feature.title} as="article">
            <Badge color="secondary" className="self-start">
              {feature.tag}
            </Badge>
            <Text as="h3" type="text20Semibold">
              {feature.title}
            </Text>
            <Text type="text14Regular" color="muted">
              {feature.body}
            </Text>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}
