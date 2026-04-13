import { brand } from './brand';

const FALLBACK_PRIMARY = '#e42545';
const FALLBACK_ACCENT = '#2eb392';

/** Normalize hex input - accepts `FEBA17` or `#FEBA17` (# is a comment char in .env files). */
function normalizeHex(raw: string): string {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed}`;
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  return '';
}

/** Convert a hex color like `#e42545` to an RGB triplet string `228 37 69`. */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/**
 * Derive a dark-mode surface color from a brand color.
 * Mixes the brand hue at low lightness/saturation into a near-black base.
 * Tuned so the defaults (#e42545) produce values close to the original
 * hand-picked surface-dark (#1c0d10 → 28 13 16) and border-dark (#2d161a → 45 22 26).
 */
function deriveDarkVariant(hex: string, lightness: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  // Blend brand color into dark base at the given ratio
  const base = 11;
  const mix = (c: number) => Math.round(base + (c - base) * lightness);
  return `${mix(r)} ${mix(g)} ${mix(b)}`;
}

/** Normalized brand colors (always `#rrggbb` format). Use these instead of brand.primaryColor directly. */
export const themeColors = {
  primary: normalizeHex(brand.primaryColor) || FALLBACK_PRIMARY,
  accent: normalizeHex(brand.accentColor) || FALLBACK_ACCENT,
};

/**
 * Inject brand color CSS custom properties onto :root.
 * Call once at app startup (before mount).
 */
export function initThemeColors(): void {
  const { primary, accent } = themeColors;

  const root = document.documentElement.style;
  root.setProperty('--color-primary', hexToRgb(primary));
  root.setProperty('--color-accent', hexToRgb(accent));
  // Dark-mode surface/border tinted with the primary hue
  root.setProperty('--color-surface-dark', deriveDarkVariant(primary, 0.08));
  root.setProperty('--color-border-dark', deriveDarkVariant(primary, 0.16));
}
