import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#010102",
        "surface-1": "#0f1011",
        "surface-2": "#141516",
        "surface-3": "#18191a",
        "surface-4": "#191a1b",
        primary: "#5e6ad2",
        "primary-hover": "#828fff",
        "primary-focus": "#5e69d1",
        ink: "#f7f8f8",
        "ink-muted": "#d0d6e0",
        "ink-subtle": "#8a8f98",
        "ink-tertiary": "#62666d",
        hairline: "#23252a",
        "hairline-strong": "#34343a",
        success: "#27a644",
      },
      fontFamily: {
        display: ["var(--font-inter)", "SF Pro Display", "-apple-system", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "SF Pro Text", "-apple-system", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        xxl: "24px",
        pill: "9999px",
      },
      spacing: {
        xxs: "4px",
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
        section: "96px",
      },
      fontSize: {
        "display-xl": ["80px", { lineHeight: "1.05", fontWeight: "600", letterSpacing: "-0.06em" }],
        "display-lg": ["56px", { lineHeight: "1.10", fontWeight: "600", letterSpacing: "-0.04em" }],
        "display-md": ["40px", { lineHeight: "1.15", fontWeight: "600", letterSpacing: "-0.025em" }],
        headline: ["28px", { lineHeight: "1.20", fontWeight: "600", letterSpacing: "-0.02em" }],
        "card-title": ["22px", { lineHeight: "1.25", fontWeight: "500", letterSpacing: "-0.015em" }],
      },
    },
  },
  plugins: [animate],
};

export default config;
