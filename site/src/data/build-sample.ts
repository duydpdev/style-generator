/**
 * Sample shown in the "Input → Output" chapter. `THEME_JSON` is a valid theme
 * and `THEME_CSS` is an excerpt of the real `generate(theme).css` output; the
 * lines between `ELISION` markers are omitted for brevity. Both are checked
 * against the library by `src/__integration__/site-build-sample.test.ts`.
 */
export const ELISION = "/* … */";

export const THEME_JSON = `{
  "colors": {
    "primary": "#2647D9",
    "background": "#FAF7F2",
    "foreground": "#0F1530"
  },
  "typography": {
    "body": {
      "fontSize": "16px",
      "fontWeight": 500,
      "lineHeight": "150%",
      "letterSpacing": "0px"
    }
  },
  "themeAxes": {
    "theme": {
      "dark": {
        "colors": {
          "primary": "#8FA6FF",
          "background": "#0B0E1D"
        }
      }
    }
  }
}`;

export const THEME_CSS = `${ELISION}

:root {
  --sg-primary: #2647D9;
  --sg-background: #FAF7F2;
  --sg-foreground: #0F1530;
}

html[data-theme="dark"] {
  --sg-primary: #8FA6FF;
  --sg-background: #0B0E1D;
}

@theme inline {
  --color-primary: var(--sg-primary);
  --color-background: var(--sg-background);
  --color-foreground: var(--sg-foreground);
}

@utility body {
  font-size: 16px;
  line-height: 150%;
  font-weight: 500;
  letter-spacing: 0px;
}

@utility sp-p {
  padding: var(--sg-sp-p);

  @media (width >= 768px) {
    padding: var(--sg-sp-p-md, var(--sg-sp-p));
  }

  @media (width >= 1024px) {
    padding: var(--sg-sp-p-lg, var(--sg-sp-p-md, var(--sg-sp-p)));
  }
}

${ELISION}

@source inline("{bg,text,border}-{primary,background,foreground}");
@source inline("{body}");`;
