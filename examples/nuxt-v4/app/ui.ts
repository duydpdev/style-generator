import { createUi } from "@duydpdev/ui-vue";
import { presets, tokens } from "design-system-example";

/**
 * The app's components, typed by the design-system theme. nuxt-v4 renders
 * every role, so it passes the full presets. Import them explicitly from "~/ui".
 */
export const {
  Box,
  Flex,
  Stack,
  Grid,
  Container,
  Text,
  Link,
  List,
  ListItem,
  Code,
  Button,
  Card,
  Badge,
  Input,
  Select,
  Dialog,
} = createUi(tokens, presets);
