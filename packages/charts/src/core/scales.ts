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

const ticksWithin = (min: number, max: number, step: number): number[] => {
  const first = Math.ceil(min / step - 1e-9);
  const last = Math.floor(max / step + 1e-9);

  return Array.from({ length: Math.max(last - first + 1, 0) }, (_unused, index) =>
    rounded((first + index) * step, step),
  );
};

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

  return { min, max: top, step, ticks: ticksWithin(min, top, step) };
};

const isPositive = (value: number): boolean => Number.isFinite(value) && value > 0;

const powerOfTen = (exponent: number): number => Number(`1e${String(exponent)}`);

const logBounds = (low: number, high: number): readonly [number, number] => {
  if (isPositive(low) && isPositive(high)) {
    return [Math.min(low, high), Math.max(low, high)];
  }

  const [top = 1] = [high, low].filter(isPositive);

  return [top / 10, top];
};

export const logDomain = (low: number, high: number, count = 5): NiceDomain => {
  const [bottom, top] = logBounds(low, high);
  const from = Math.floor(Math.log10(bottom));
  const to = Math.max(Math.ceil(Math.log10(top)), from + 1);
  const stride = Math.max(Math.ceil((to - from) / Math.max(count, 1)), 1);

  return {
    min: powerOfTen(from),
    max: powerOfTen(to),
    step: 10,
    ticks: Array.from({ length: Math.floor((to - from) / stride) + 1 }, (_unused, index) =>
      powerOfTen(from + index * stride),
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
