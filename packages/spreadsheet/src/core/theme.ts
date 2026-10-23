import type { StyleColor } from './decorations';

export type ThemePalette = readonly string[];

export const THEME_SLOTS = [
  'dk1',
  'lt1',
  'dk2',
  'lt2',
  'accent1',
  'accent2',
  'accent3',
  'accent4',
  'accent5',
  'accent6',
  'hlink',
  'folHlink',
] as const;

export const OFFICE_THEME: ThemePalette = [
  '000000',
  'FFFFFF',
  '44546A',
  'E7E6E6',
  '4472C4',
  'ED7D31',
  'A5A5A5',
  'FFC000',
  '5B9BD5',
  '70AD47',
  '0563C1',
  '954F72',
];

const THEME_ORDER = [1, 0, 3, 2, 4, 5, 6, 7, 8, 9, 10, 11];

const INDEXED = [
  '000000',
  'FFFFFF',
  'FF0000',
  '00FF00',
  '0000FF',
  'FFFF00',
  'FF00FF',
  '00FFFF',
  '000000',
  'FFFFFF',
  'FF0000',
  '00FF00',
  '0000FF',
  'FFFF00',
  'FF00FF',
  '00FFFF',
  '800000',
  '008000',
  '000080',
  '808000',
  '800080',
  '008080',
  'C0C0C0',
  '808080',
  '9999FF',
  '993366',
  'FFFFCC',
  'CCFFFF',
  '660066',
  'FF8080',
  '0066CC',
  'CCCCFF',
  '000080',
  'FF00FF',
  'FFFF00',
  '00FFFF',
  '800080',
  '800000',
  '008080',
  '0000FF',
  '00CCFF',
  'CCFFFF',
  'CCFFCC',
  'FFFF99',
  '99CCFF',
  'FF99CC',
  'CC99FF',
  'FFCC99',
  '3366FF',
  '33CCCC',
  '99CC00',
  'FFCC00',
  'FF9900',
  'FF6600',
  '666699',
  '969696',
  '003366',
  '339966',
  '003300',
  '333300',
  '993300',
  '993366',
  '333399',
  '333333',
];

const HEX = /^[\da-f]{6}$/iu;

const channels = (hex: string): readonly [number, number, number] => [
  Number.parseInt(hex.slice(0, 2), 16) / 255,
  Number.parseInt(hex.slice(2, 4), 16) / 255,
  Number.parseInt(hex.slice(4, 6), 16) / 255,
];

const hue = (red: number, green: number, blue: number, high: number, span: number): number => {
  if (span === 0) {
    return 0;
  }
  if (high === red) {
    return ((green - blue) / span + 6) % 6;
  }
  return high === green ? (blue - red) / span + 2 : (red - green) / span + 4;
};

const toHsl = (hex: string): readonly [number, number, number] => {
  const [red, green, blue] = channels(hex);
  const high = Math.max(red, green, blue);
  const low = Math.min(red, green, blue);
  const light = (high + low) / 2;
  const span = high - low;
  const saturation = span === 0 ? 0 : span / (1 - Math.abs(2 * light - 1));

  return [hue(red, green, blue, high, span) * 60, saturation, light];
};

const channelHex = (value: number): string =>
  Math.round(Math.min(Math.max(value, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();

const fromHsl = (degrees: number, saturation: number, light: number): string => {
  const chroma = (1 - Math.abs(2 * light - 1)) * saturation;
  const section = degrees / 60;
  const second = chroma * (1 - Math.abs((section % 2) - 1));
  const base = light - chroma / 2;

  const sides: readonly (readonly [number, number, number])[] = [
    [chroma, second, 0],
    [second, chroma, 0],
    [0, chroma, second],
    [0, second, chroma],
    [second, 0, chroma],
    [chroma, 0, second],
  ];

  const [red, green, blue] = sides[Math.floor(section) % 6] ?? [0, 0, 0];

  return `${channelHex(red + base)}${channelHex(green + base)}${channelHex(blue + base)}`;
};

export const tinted = (hex: string, tint: number): string => {
  if (tint === 0) {
    return hex.toUpperCase();
  }

  const [degrees, saturation, light] = toHsl(hex);
  const shaded = tint < 0 ? light * (1 + tint) : light * (1 - tint) + tint;

  return fromHsl(degrees, saturation, shaded);
};

const themeHex = (theme: ThemePalette, index: number): string | undefined =>
  theme[THEME_ORDER[index] ?? -1] ?? OFFICE_THEME[THEME_ORDER[index] ?? -1];

export const colorHex = (
  color: StyleColor | undefined,
  theme: ThemePalette,
): string | undefined => {
  switch (color?.kind) {
    case 'rgb': {
      const hex = color.argb.slice(-6);

      return HEX.test(hex) ? hex.toUpperCase() : undefined;
    }
    case 'theme': {
      const hex = themeHex(theme, color.theme);

      return hex === undefined ? undefined : tinted(hex, color.tint);
    }
    case 'indexed':
      return INDEXED[color.index];
    default:
      return undefined;
  }
};
