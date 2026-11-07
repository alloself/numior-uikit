const DARK_MIN = 0.72;

const DARK_MAX = 0.94;

const linearOf = (hex: string, at: number): number => {
  const channel = Number.parseInt(hex.slice(at, at + 2), 16) / 255;

  return channel <= 0.040_45 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
};

const round = (value: number, digits: number): number => {
  const scale = 10 ** digits;

  return Math.round(value * scale) / scale;
};

const darkInk = (css: string): string => {
  const hex = css.replace('#', '');
  const r = linearOf(hex, 0);
  const g = linearOf(hex, 2);
  const b = linearOf(hex, 4);
  const l = Math.cbrt(0.412_221_470_8 * r + 0.536_332_536_3 * g + 0.051_445_992_9 * b);
  const m = Math.cbrt(0.211_903_498_2 * r + 0.680_699_545_1 * g + 0.107_396_956_6 * b);
  const s = Math.cbrt(0.088_302_461_9 * r + 0.281_718_837_6 * g + 0.629_978_700_5 * b);
  const lightness = 0.210_454_255_3 * l + 0.793_617_785 * m - 0.004_072_046_8 * s;
  const a = 1.977_998_495_1 * l - 2.428_592_205 * m + 0.450_593_709_9 * s;
  const bb = 0.025_904_037_1 * l + 0.782_771_766_2 * m - 0.808_675_766 * s;
  const chroma = Math.hypot(a, bb);
  const hue = (Math.atan2(bb, a) * 180) / Math.PI;
  const next = Math.min(DARK_MAX, Math.max(DARK_MIN, lightness, 1 - lightness));

  return `oklch(${String(round(next, 3))} ${String(round(chroma, 3))} ${String(round(hue < 0 ? hue + 360 : hue, 1))})`;
};

export const adaptiveInk = (css: string): string => `light-dark(${css}, ${darkInk(css)})`;
