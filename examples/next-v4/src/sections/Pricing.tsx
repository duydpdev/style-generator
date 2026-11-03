import type { JSX } from "react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Flex } from "../ui/flex";
import { Grid } from "../ui/grid";
import { Stack } from "../ui/stack";
import { Text } from "../ui/text";

import { PLANS } from "./content";
import { Section } from "./Section";
import { SectionHead } from "./SectionHead";

/** Three plans; the featured one gets a thicker primary border and a badge. */
export function Pricing(): JSX.Element {
  return (
    <Section id="pricing">
      <SectionHead
        eyebrow="Pricing"
        title="Free and MIT licensed"
        lede="Every part ships in one package. Pick where to start."
      />
      <Grid columns={{ base: 1, md: 3 }} gap={4}>
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            as="article"
            tone={plan.featured ? "surface" : "muted"}
            shadow={plan.featured ? "md" : "none"}
            border={plan.featured ? "thick" : "thin"}
            className={plan.featured ? "border-primary" : undefined}
          >
            <Flex align="center" justify="between" gap={2}>
              <Text as="h3" type="text20Semibold">
                {plan.name}
              </Text>
              {plan.featured && (
                <Badge color="primary" variant="solid">
                  Popular
                </Badge>
              )}
            </Flex>
            <Text type="text32Bold">{plan.price}</Text>
            <Text type="text14Regular" color="muted">
              {plan.summary}
            </Text>
            <Stack as="ul" gap={2} className="list-none">
              {plan.items.map((item) => (
                <Text as="li" key={item} type="text14Regular">
                  {item}
                </Text>
              ))}
            </Stack>
            <Button
              as="a"
              href={plan.href}
              variant={plan.featured ? "fill" : "outline"}
              className="mt-auto"
            >
              {plan.action}
            </Button>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}
