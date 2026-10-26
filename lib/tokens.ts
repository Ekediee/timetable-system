/**
 * Design Tokens for Timetable System
 * Source of truth: app/globals.css (@theme) and design-tokens.json
 */

export const tokens = {
  colors: {
    canvas: "#eef1f5",
    panel: "#f5f6f8",
    card: "#ffffff",
    ink: "#10131a",
    subink: "#414652",
    muted: "#737884",
    line: "#e7e9ee",
    lineSoft: "#eef0f4",
    brand: "#2f66ff",
    brandInk: "#1e4fd6",
    brandSoft: "#e9effe",
    good: "#16a06a",
    goodSoft: "#e6f6ee",
    warn: "#d9822b",
    warnSoft: "#fbf0e2",
    bad: "#dc3d43",
    badSoft: "#fcecec",
    violet: "#6b53d6",
    violetSoft: "#efecfb",
  },
  typography: {
    fontSans: 'var(--font-inter), ui-sans-serif, system-ui, -apple-system, sans-serif',
    featureSettings: '"cv11", "ss01"',
  },
  borderRadius: {
    card: "1rem", // 16px (rounded-2xl)
    interactive: "0.75rem", // 12px (rounded-xl)
    pill: "9999px", // rounded-full
  },
  animation: {
    fade: "bpFade 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
  },
} as const;

export type DesignTokens = typeof tokens;
export type ColorToken = keyof typeof tokens.colors;
