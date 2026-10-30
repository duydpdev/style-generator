import { ChapterHead } from "../components/chapter-head";
import { Box } from "../ui";
import { CodeCard } from "../components/code-card";
import { KeyPoint } from "../components/key-point";

const TS_CODE = `import type {
  ColorVariant, TextVariant, ShadowVariant,
} from "@duydpdev/style-generator/types";

import themeJson from "./theme.json";
type Theme = typeof themeJson;

interface BoxProps {
  bg?:     ColorVariant<Theme>;
  text?:   TextVariant<Theme>;
  shadow?: ShadowVariant<Theme>;
}

// Autocomplete from theme.json
<Box bg="primary" shadow="md" />

// TS error — no such key
<Box bg="primori" />
//        ~~~~~~~~ Type error`;

/**
 *
 */
export function TypesSection() {
  return (
    <Box
      as="section"
      id="types"
      data-ch="07"
      data-ch-label="TypeScript"
      pt={14}
      pb={2}
      mt={6}
    >
      <ChapterHead
        num="07"
        label="TypeScript inference"
        title={
          <>
            Typed tokens. <em>Compile-time safety.</em>
          </>
        }
        lede={
          <>
            Your JSON becomes a type. Props infer from it. No more drift between
            CSS values and component variants.
          </>
        }
      />

      <div className="split-grid" data-reveal="up">
        <div className="kp-list">
          <KeyPoint
            badge="T1"
            title={<code>ColorVariant&lt;Theme&gt;</code>}
            body={
              <>
                Every <code>colors</code> key, autocompleted. Type errors on
                typos.
              </>
            }
          />
          <KeyPoint
            badge="T2"
            title={
              <>
                <code>TextVariant</code>, <code>ShadowVariant</code>
              </>
            }
            body={<>Same trick for typography, shadows, radii, blurs.</>}
          />
          <KeyPoint
            badge="T3"
            title={<code>ResponsiveValueStrict</code>}
            body={<>Lock breakpoint keys to your real screen names.</>}
          />
          <KeyPoint
            badge="T4"
            title={<code>createDesignTokens()</code>}
            body={<>Typed token arrays for CVA, runtime-checked.</>}
          />
        </div>
        <CodeCard filename="Box.tsx" tag="typed" lang="ts" code={TS_CODE} />
      </div>
    </Box>
  );
}
