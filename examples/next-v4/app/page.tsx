import { intents } from "design-system-example";

import { DialogDemo } from "./DialogDemo";
import { ThemeSwitch } from "./ThemeSwitch";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Input,
  Stack,
  Text,
} from "./ui";

const BUTTON_VARIANTS = ["fill", "outline", "soft", "ghost", "link"] as const;

export default function Page() {
  return (
    <Container as="main" maxWidth={960} py={{ base: 6, md: 10 }} px={4}>
      {/* #region docs:usage */}
      <Stack as="header" justify="between" wrap>
        <Box>
          <Text type="text12Mono" color="muted">
            @duydpdev/style-generator · Next.js 16
          </Text>
          <Text as="h1" type="display56Serif">
            Shared design system
          </Text>
        </Box>
        <ThemeSwitch />
      </Stack>

      <Card as="section" tone="surface" padding="lg">
        <Stack gap={{ base: 2, md: 4 }}>
          <Text as="h2" type="text20Semibold">
            Buttons
          </Text>
          {intents.map((color) => (
            <Flex key={color} wrap gap={2}>
              <Badge color={color}>{color}</Badge>
              {BUTTON_VARIANTS.map((variant) => (
                <Button key={variant} variant={variant} color={color}>
                  {variant}
                </Button>
              ))}
            </Flex>
          ))}
        </Stack>
      </Card>

      <Card as="section" tone="outline" padding="md">
        <Stack gap={3}>
          <Text as="h2" type="text20Semibold">
            Inputs
          </Text>
          <Input size="md" placeholder="Default input" />
          <Input size="md" invalid placeholder="Invalid input" />
        </Stack>
      </Card>

      <Box
        as="section"
        backgroundColor="surface"
        rounded="lg"
        shadow="md"
        p={6}
      >
        <DialogDemo />
      </Box>
      {/* #endregion docs:usage */}
    </Container>
  );
}
