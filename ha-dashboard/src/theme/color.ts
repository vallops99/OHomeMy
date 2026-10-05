/**
 * Colour arithmetic on Casa Panel's hex tokens: enough to measure contrast
 * (ADR-0013 keeps ADR-0001's contrast findings as checks, not as code) and to
 * hand @hakit the HSL roots it derives its own palette from.
 */

type Rgba = { r: number; g: number; b: number; a: number };

/** `#rrggbb` or `#rrggbbaa`, channels 0-255 and alpha 0-1. */
function parse(hex: string): Rgba {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!m) throw new Error(`not a #rrggbb[aa] colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: m[2] ? parseInt(m[2], 16) / 255 : 1 };
}

const linear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = ({ r, g, b }: Rgba) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');

/** `fg` laid over an opaque `bg`, as the opaque `#rrggbb` the eye sees. */
export function flatten(fg: string, bg: string): string {
  const f = parse(fg);
  const b = parse(bg);
  const over = (fc: number, bc: number) => fc * f.a + bc * (1 - f.a);
  return `#${hex2(over(f.r, b.r))}${hex2(over(f.g, b.g))}${hex2(over(f.b, b.b))}`;
}

/**
 * The WCAG contrast ratio of `fg` on `bg`, 1 to 21. A translucent `fg` is
 * first flattened over `bg`, which is how `accent-soft` actually reaches the
 * eye; `bg` is taken as opaque.
 */
export function contrast(fg: string, bg: string): number {
  const lf = luminance(parse(flatten(fg, bg)));
  const lb = luminance(parse(bg));
  return (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
}

/** Hue in degrees, saturation and lightness in percent, each rounded. */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = parse(hex);
  const [rf, gf, bf] = [r / 255, g / 255, b / 255];
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: Math.round(l * 100) };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === rf ? ((gf - bf) / d) % 6 : max === gf ? (bf - rf) / d + 2 : (rf - gf) / d + 4;
  return { h: Math.round((h * 60 + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** An opaque `#rrggbb` at the given alpha, as `#rrggbbaa`. */
export function withAlpha(hex: string, alpha: number): string {
  parse(hex);
  return `${hex.slice(0, 7)}${hex2(alpha * 255)}`;
}
