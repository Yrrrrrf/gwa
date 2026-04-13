export const COLORS = [
  "primary",
  "secondary",
  "accent",
  "neutral",
  "info",
  "success",
  "warning",
  "error",
] as const;

export const SIZES = ["xs", "sm", "md", "lg"] as const;

export const STYLES = ["outline", "ghost", "link", "glass"] as const;

export const BTN_STYLES = [
  ...STYLES,
  "active",
  "disabled",
  "wide",
  "block",
  "circle",
  "square",
] as const;

export const BADGE_STYLES = ["outline", "ghost"] as const;

export const ALERT_STYLES = ["soft"] as const;

export const CARD_STYLES = [
  "bordered",
  "image-full",
  "compact",
  "side",
] as const;
