import { Link } from "react-router-dom";

import { ChapterMarker } from "../components/chapter-head";
import { Box, Flex, Grid, Stack, Text } from "../ui";
import { ArrowRight } from "../components/icon";
import { INSTALL_CMD, MARQUEE_TOKENS, STATS } from "../data/hero";

/**
 *
 */
export function HeroSection() {
  return (
    <Box
      as="section"
      id="hero"
      data-ch="00"
      data-ch-label="Cover"
      pt={18}
      pb={8}
    >
      <ChapterMarker num="00" />
      <Box data-reveal="stagger">
        <Flex
          data-part="hero-eyebrow"
          align="center"
          gap={2.5}
          px={3}
          py={1.5}
          mb={7}
          rounded="pill"
          backgroundColor="paper"
        >
          <Box
            as="span"
            data-part="dot"
            backgroundColor="success"
            width={6}
            height={6}
          />
          Typed · Tailwind v4 · MIT
        </Flex>
        <Text as="h1" data-part="hero-title" color="foreground" mb={7}>
          A design system from <em>one</em> JSON.
        </Text>
        <Text as="p" data-part="hero-lede" color="muted" mb={10}>
          <b>@duydpdev/style-generator</b> compiles a flat{" "}
          <code>theme.json</code> into complete Tailwind v4 CSS — variables,
          dark mode overrides, registry-generated <code>@source inline</code>{" "}
          utility coverage, runtime spacing utilities, typed design tokens. One
          source of truth. No safelist file to maintain.
        </Text>
        <Flex wrap align="center" gap={3}>
          <Flex
            as={Link}
            to="/docs/reference#1-installation"
            data-part="install"
            align="center"
            gap={2.5}
            py={1.75}
            pr={1.75}
            pl={3.5}
            rounded="md"
            backgroundColor="paper"
          >
            <Text as="span" color="muted">
              $
            </Text>
            <Text as="span">{INSTALL_CMD}</Text>
            <Text
              as="span"
              data-part="install-go"
              color="foreground"
              px={2.5}
              py={1.5}
            >
              Install guide →
            </Text>
          </Flex>
          <Flex
            as="a"
            data-part="btn btn-primary btn-lg"
            align="center"
            gap={1.5}
            px={5}
            py={3}
            href="#start"
          >
            Get started <ArrowRight />
          </Flex>
        </Flex>
      </Box>

      <Grid
        data-part="hero-stats"
        data-reveal="stagger"
        columns={4}
        gap={6}
        mt={14}
        py={6}
      >
        {STATS.map((s) => (
          <Stack key={s.k} gap={1}>
            <Text as="span" data-part="k" color="muted">
              {s.k}
            </Text>
            <Text
              as="span"
              data-part="v"
              color={"accent" in s ? "primary" : undefined}
            >
              {s.v}
            </Text>
            <Text as="span" data-part="m" color="muted">
              {s.m}
            </Text>
          </Stack>
        ))}
      </Grid>

      <Flex data-part="marquee" aria-hidden="true" gap={9} mt={12}>
        <Flex data-part="marquee-track" gap={9}>
          {[...MARQUEE_TOKENS, ...MARQUEE_TOKENS].map((t, i) => (
            <Flex
              as="span"
              key={`${t}-${String(i)}`}
              data-part="marquee-item"
              align="center"
              gap={1.5}
            >
              {t}
            </Flex>
          ))}
        </Flex>
      </Flex>
    </Box>
  );
}
