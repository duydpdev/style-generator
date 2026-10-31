import { ScrollProgress } from "../components/scroll-progress";
import { SidebarToc } from "../components/sidebar-toc";
import { Topbar } from "../components/topbar";
import { chapters } from "../lib/chapters";
import { useReveal } from "../lib/use-reveal";
import { scrollToChapter, useScrollSpy } from "../lib/use-scroll-spy";
import { useTheme } from "../lib/use-theme";
import { BuildSection } from "../sections/build-section";
import { CompareSection } from "../sections/compare-section";
import { CtaFooter } from "../sections/cta-footer";
import { FeaturesSection } from "../sections/features-section";
import { HeroSection } from "../sections/hero-section";
import { SpacingSection } from "../sections/spacing-section";
import { StartSection } from "../sections/start-section";
import { ThemingSection } from "../sections/theming-section";
import { ToolingSection } from "../sections/tooling-section";
import { TypesSection } from "../sections/types-section";
import { WhySection } from "../sections/why-section";
import { Box, Container, Grid } from "../ui";

const PAGE_MAX_WIDTH =
  "calc(var(--content-w) + var(--sidebar-w) + var(--gutter) * 2)";

export function LandingPage() {
  const { toggle } = useTheme();
  const { activeIndex, progress } = useScrollSpy(chapters);
  useReveal();

  const activeChapter = activeIndex > 0 ? chapters[activeIndex] : null;

  return (
    <>
      <ScrollProgress progress={progress} />
      <Topbar activeChapter={activeChapter} onToggleTheme={toggle} />
      <Container
        data-part="shell"
        maxWidth={PAGE_MAX_WIDTH}
        px={8}
        position="relative"
      >
        <Grid data-part="shell-grid" gap={{ base: 0, lg: 24 }}>
          <SidebarToc
            chapters={chapters}
            activeIndex={activeIndex}
            onJump={scrollToChapter}
          />
          <Box as="main" minWidth={0}>
            <HeroSection />
            <WhySection />
            <CompareSection />
            <BuildSection />
            <FeaturesSection />
            <SpacingSection />
            <ThemingSection />
            <TypesSection />
            <ToolingSection />
            <StartSection />
            <CtaFooter />
          </Box>
        </Grid>
      </Container>
    </>
  );
}
