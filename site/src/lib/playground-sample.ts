/** The theme the playground opens with: colors (one `$` alias), typography, a shadow and a dark axis. */
export const SAMPLE_THEME = `{
  "colors": {
    "primary": "#2647D9",
    "onPrimary": "#FFFFFF",
    "surface": "#FBF7EF",
    "link": "$primary"
  },
  "typography": {
    "heading": {
      "fontSize": "32px",
      "fontWeight": 600,
      "lineHeight": "110%"
    },
    "body": {
      "fontSize": "16px",
      "fontWeight": 400,
      "lineHeight": "150%"
    }
  },
  "shadows": {
    "card": "0px 8px 24px -8px rgba(15, 21, 48, 0.12)"
  },
  "themeAxes": {
    "theme": {
      "dark": {
        "colors": {
          "surface": "#11142A"
        }
      }
    }
  }
}
`;
