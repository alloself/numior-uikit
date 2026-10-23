export interface NiceDomain {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly ticks: readonly number[];
}

export interface DomainOptions {
  readonly count?: number | undefined;
  readonly zero?: boolean | undefined;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
}

export interface BandScale {
  readonly step: number;
  readonly width: number;
  readonly start: (index: number) => number;
  readonly center: (index: number) => number;
}

export interface BandOptions {
  readonly inner?: number | undefined;
  readonly outer?: number | undefined;
}

const STEPS = [1, 2, 2.5, 5, 10];

const ZERO_RATIO = 5 / 6;

const TINY = 1e-200;

const RESOLUTION = 1e-9;

const cleaned = (value: number): number => (Math.abs(value) < TINY ? 0 : value);

export const niceStep = (span: number, count: number): number => {
  const raw = span / Math.max(count, 1);
  const magnitude = 10 ** Math.floor(Math.log10(raw));

  return (STEPS.find((step) => step * magnitude >= raw - 1e-12 * raw) ?? 10) * magnitude;
};

const rounded = (value: number, step: number): number => {
  if (Math.abs(value) < step * 1e-9) {
    return 0;
  }

  const digits = Math.ceil(Math.log10(Math.abs(value) / step)) + 3;

  return Number(value.toPrecision(Math.min(Math.max(digits, 1), 17)));
};

const ticksBetween = (min: number, max: number, step: number): number[] =>
  Array.from({ length: Math.round((max - min) / step) + 1 }, (_unused, index) =>
    rounded(min + index * step, step),
  );

const withZero = (min: number, max: number, zero: boolean): readonly [number, number] => {
  if (min >= 0) {
    return zero || min <= max * ZERO_RATIO ? [0, max] : [min, max];
  }
  if (max <= 0) {
    return zero || max >= min * ZERO_RATIO ? [min, 0] : [min, max];
  }
  return [min, max];
};

export const niceDomain = (low: number, high: number, options: DomainOptions = {}): NiceDomain => {
  const count = options.count ?? 5;

  const [from, to] = withZero(
    Math.min(cleaned(low), cleaned(high)),
    Math.max(cleaned(low), cleaned(high)),
    options.zero ?? false,
  );

  const lower = options.min ?? from;

  const degenerate =
    (options.max ?? to) - lower <=
    RESOLUTION * Math.max(Math.abs(lower), Math.abs(options.max ?? to), TINY);

  const span = degenerate ? Math.abs(lower) || 1 : (options.max ?? to) - lower;
  const upper = options.max ?? (degenerate ? lower + span : to);
  const step = niceStep(span, count);
  const min = options.min ?? rounded(Math.floor(lower / step + 1e-9) * step, step);
  const max = options.max ?? rounded(Math.ceil(upper / step - 1e-9) * step, step);
  const top = max > min ? max : rounded(min + step, step);

  return { min, max: top, step, ticks: ticksBetween(min, top, step) };
};

export const logDomain = (low: number, high: number): NiceDomain => {
  const min = 10 ** Math.floor(Math.log10(Math.max(low, Number.MIN_VALUE)));
  const max = Math.max(10 ** Math.ceil(Math.log10(Math.max(high, low))), min * 10);

  return {
    min,
    max,
    step: 10,
    ticks: Array.from(
      { length: Math.round(Math.log10(max / min)) + 1 },
      (_unused, index) => min * 10 ** index,
    ),
  };
};

export const linearScale =
  (domain: readonly [number, number], range: readonly [number, number]) =>
  (value: number): number =>
    range[0] + ((value - domain[0]) / (domain[1] - domain[0] || 1)) * (range[1] - range[0]);

export const logScale =
  (domain: readonly [number, number], range: readonly [number, number]) =>
  (value: number): number => {
    const from = Math.log10(domain[0]);
    const span = Math.log10(domain[1]) - from || 1;

    return range[0] + ((Math.log10(value) - from) / span) * (range[1] - range[0]);
  };

export const bandScale = (
  count: number,
  range: readonly [number, number],
  options: BandOptions = {},
): BandScale => {
  const inner = options.inner ?? 0.3;
  const outer = options.outer ?? 0.15;
  const forward = range[1] >= range[0];
  const step = Math.abs(range[1] - range[0]) / Math.max(count - inner + 2 * outer, 1);
  const width = step * (1 - inner);

  const start = (index: number): number => {
    const offset = step * (outer + index);

    return forward ? range[0] + offset : range[0] - offset - width;
  };

  return { step, width, start, center: (index) => start(index) + width / 2 };
};
