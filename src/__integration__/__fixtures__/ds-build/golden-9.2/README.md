# Fixture

Built from `theme.json` by the style-generator design-system producer; do not edit token values here.

## Naming

- Primitive colours are named after their value: `<hue><100..900>`, with an optional `Alpha<pct>` suffix.
- Semantic colour keys name a role and alias a primitive (`$<primitive>`).
- Typography keys are `text<size><Weight>`; a font family is a separate `font-<family>` class.

Full convention: style-generator documents/agent-contract.md → "Naming convention".

## Colours

### Primitives

| key             | value                                                        |
| --------------- | ------------------------------------------------------------ |
| `white`         | #ffffff                                                      |
| `gray100`       | #f3f4f6                                                      |
| `gray500`       | #6b7280                                                      |
| `gray900`       | #111827                                                      |
| `blue600`       | #2563eb                                                      |
| `blue700`       | #1d4ed8                                                      |
| `blue800`       | #1e40af                                                      |
| `red600`        | #dc2626                                                      |
| `green600`      | #16a34a                                                      |
| `amber500`      | #f59e0b                                                      |
| `blackAlpha40`  | rgba(0, 0, 0, 0.4)                                           |
| `primarySubtle` | color-mix(in srgb, var(--sg-color-primary) 10%, transparent) |
| `dangerSubtle`  | color-mix(in srgb, var(--sg-color-danger) 10%, transparent)  |

### Semantic

| key                       | base          | dark     |
| ------------------------- | ------------- | -------- |
| `background`              | $white        | $gray900 |
| `surface`                 | $gray100      | $gray500 |
| `foreground`              | $gray900      | $gray100 |
| `muted`                   | $gray500      | —        |
| `border`                  | $gray100      | —        |
| `primary`                 | $blue600      | —        |
| `primaryHover`            | $blue700      | —        |
| `primaryActive`           | $blue800      | —        |
| `primaryForeground`       | $white        | —        |
| `primarySubtleForeground` | $primary      | —        |
| `danger`                  | $red600       | —        |
| `dangerSubtleForeground`  | $danger       | —        |
| `success`                 | $green600     | —        |
| `warning`                 | $amber500     | —        |
| `focus`                   | $blue600      | —        |
| `scrim`                   | $blackAlpha40 | —        |

## Typography

| key              | size | line height | weight | family |
| ---------------- | ---- | ----------- | ------ | ------ |
| `text14Medium`   | 14px | 20px        | 500    | —      |
| `text16Regular`  | 16px | 24px        | 400    | —      |
| `text20Semibold` | 20px | 28px        | 600    | —      |
| `text32Bold`     | 32px | 40px        | 700    | —      |

## Radius

| key    | value  |
| ------ | ------ |
| `sm`   | 4px    |
| `md`   | 8px    |
| `lg`   | 12px   |
| `full` | 9999px |

## Components

### Box

```jsx
const { Box, Text } = window.Fixture;
<Box>
  <Text>One</Text>
  <Text>Two</Text>
</Box>;
```

### Text

```jsx
const { Text } = window.Fixture;
<Text type="text14Medium">Body copy</Text>;
```

### Stack

```jsx
const { Stack, Text } = window.Fixture;
<Stack>
  <Text>One</Text>
  <Text>Two</Text>
</Stack>;
```

### Flex

```jsx
const { Flex, Text } = window.Fixture;
<Flex>
  <Text>One</Text>
  <Text>Two</Text>
</Flex>;
```

### Grid

```jsx
const { Grid, Text } = window.Fixture;
<Grid>
  <Text>One</Text>
  <Text>Two</Text>
</Grid>;
```

### Button

```jsx
const { Button } = window.Fixture;
<Button color="primary" variant="solid">
  Save
</Button>;
```
