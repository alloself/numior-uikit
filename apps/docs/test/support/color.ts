export type Oklab = readonly [lightness: number, a: number, b: number];

type Triple = readonly [number, number, number];

const HEX_RE = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/iu;
const OKLCH_RE = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/u;

const decode = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

const labOfLinear = ([red, green, blue]: Triple): Oklab => {
  const long = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const medium = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const short = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);

  return [
    0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
    1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short,
    0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short,
  ];
};

const linearOfLab = ([lightness, a, b]: Oklab): Triple => {
  const long = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const medium = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const short = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    clamp(4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short),
    clamp(-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short),
    clamp(-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short),
  ];
};

export const parseColor = (css: string): Oklab => {
  const hex = HEX_RE.exec(css);

  if (hex !== null) {
    const [red = 0, green = 0, blue = 0] = hex
      .slice(1)
      .map((pair) => decode(Number.parseInt(pair, 16) / 255));

    return labOfLinear([red, green, blue]);
  }

  const oklch = OKLCH_RE.exec(css);

  if (oklch === null) {
    throw new Error(`Unsupported colour: ${css}`);
  }

  const [lightness = 0, chroma = 0, hue = 0] = oklch.slice(1).map(Number);
  const angle = (hue * Math.PI) / 180;

  return [lightness, chroma * Math.cos(angle), chroma * Math.sin(angle)];
};

export const mixColors = (color: Oklab, base: Oklab, share: number): Oklab => [
  color[0] * share + base[0] * (1 - share),
  color[1] * share + base[1] * (1 - share),
  color[2] * share + base[2] * (1 - share),
];

const luminanceOf = (color: Oklab): number => {
  const [red, green, blue] = linearOfLab(color);

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

export const contrastOf = (text: Oklab, surface: Oklab): number => {
  const [lighter, darker] = [luminanceOf(text), luminanceOf(surface)].toSorted(
    (first, second) => second - first,
  );

  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
};
