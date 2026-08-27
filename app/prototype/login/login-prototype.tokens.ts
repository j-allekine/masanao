import type { CSSProperties } from "react";

import tokens from "../../../tokens.json";

type TokenDimension = {
  $value: {
    value: number;
    unit: string;
  };
};

type ColorToken = {
  $value: { hex: string } | string;
};

type TokenDocument = {
  color: Record<string, ColorToken>;
  spacing: Record<string, TokenDimension>;
  rounded: Record<string, TokenDimension>;
};

const tokenDocument = tokens as unknown as TokenDocument;

const colorHex = (tokenPath: string, chain: string[] = []): string => {
  if (chain.includes(tokenPath)) {
    throw new Error(`Circular design token reference: ${[...chain, tokenPath].join(" -> ")}`);
  }

  const token = tokenPath.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, tokenDocument) as ColorToken | undefined;

  if (!token) {
    throw new Error(`Missing design token: ${tokenPath}`);
  }

  if (typeof token.$value === "string") {
    const reference = token.$value.match(/^\{([^}]+)\}$/)?.[1];
    if (!reference) {
      throw new Error(`Invalid design token reference: ${tokenPath}`);
    }
    return colorHex(reference, [...chain, tokenPath]);
  }

  return token.$value.hex;
};

const dimension = (token: TokenDimension) => `${token.$value.value}${token.$value.unit}`;

export const prototypeTokenStyle = {
  "--token-canvas": colorHex("color.canvas"),
  "--token-surface": colorHex("color.surface"),
  "--token-surface-raised": colorHex("color.surfaceRaised"),
  "--token-surface-subtle": colorHex("color.surfaceSubtle"),
  "--token-ink": colorHex("color.ink"),
  "--token-ink-muted": colorHex("color.inkMuted"),
  "--token-border": colorHex("color.border"),
  "--token-border-control": colorHex("color.borderControl"),
  "--token-primary": colorHex("color.primary"),
  "--token-primary-strong": colorHex("color.primaryStrong"),
  "--token-primary-soft": colorHex("color.primarySoft"),
  "--token-on-primary": colorHex("color.onPrimary"),
  "--token-secondary": colorHex("color.secondary"),
  "--token-secondary-soft": colorHex("color.secondarySoft"),
  "--token-secondary-ink": colorHex("color.secondaryInk"),
  "--token-accent": colorHex("color.accent"),
  "--token-accent-soft": colorHex("color.accentSoft"),
  "--token-accent-strong": colorHex("color.accentStrong"),
  "--token-on-accent": colorHex("color.onAccent"),
  "--token-on-accent-strong": colorHex("color.onAccentStrong"),
  "--token-success": colorHex("color.success"),
  "--token-success-soft": colorHex("color.successSoft"),
  "--token-success-ink": colorHex("color.successInk"),
  "--token-on-success": colorHex("color.onSuccess"),
  "--token-warning": colorHex("color.warning"),
  "--token-warning-soft": colorHex("color.warningSoft"),
  "--token-warning-ink": colorHex("color.warningInk"),
  "--token-on-warning": colorHex("color.onWarning"),
  "--token-danger": colorHex("color.danger"),
  "--token-danger-soft": colorHex("color.dangerSoft"),
  "--token-danger-ink": colorHex("color.dangerInk"),
  "--token-on-danger": colorHex("color.onDanger"),
  "--token-info": colorHex("color.info"),
  "--token-info-soft": colorHex("color.infoSoft"),
  "--token-info-ink": colorHex("color.infoInk"),
  "--token-on-info": colorHex("color.onInfo"),
  "--token-focus-ring": colorHex("color.focusRing"),
  "--token-focus-ring-inverse": colorHex("color.focusRingInverse"),
  "--token-space-xs": dimension(tokenDocument.spacing.xs),
  "--token-space-sm": dimension(tokenDocument.spacing.sm),
  "--token-space-md": dimension(tokenDocument.spacing.md),
  "--token-space-lg": dimension(tokenDocument.spacing.lg),
  "--token-space-xl": dimension(tokenDocument.spacing.xl),
  "--token-space-2xl": dimension(tokenDocument.spacing["2xl"]),
  "--token-space-3xl": dimension(tokenDocument.spacing["3xl"]),
  "--token-space-4xl": dimension(tokenDocument.spacing["4xl"]),
  "--token-page-gutter": dimension(tokenDocument.spacing.pageGutter),
  "--token-radius-sm": dimension(tokenDocument.rounded.sm),
  "--token-radius-md": dimension(tokenDocument.rounded.md),
  "--token-radius-lg": dimension(tokenDocument.rounded.lg),
  "--token-radius-pill": dimension(tokenDocument.rounded.pill),
} as CSSProperties & Record<string, string>;
