export interface NumberBounds {
  readonly step: number;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
}

export type SnapMode = 'round' | 'floor' | 'ceil';

export const decimalPlaces = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const [mantissa = '', exponent = '0'] = String(value).split('e');
  const fraction = mantissa.split('.')[1]?.length ?? 0;
  return Math.min(15, Math.max(0, fraction - Number(exponent)));
};

export const clampNumber = (value: number, min?: number, max?: number): number => {
  const floor = min === undefined ? value : Math.max(min, value);
  return max === undefined ? floor : Math.min(max, floor);
};

const scaleFor = (...values: number[]): number => 10 ** Math.max(...values.map(decimalPlaces));

export const snapToStep = (
  value: number,
  step: number,
  origin = 0,
  mode: SnapMode = 'round',
): number => {
  if (step <= 0) {
    return value;
  }
  const scale = scaleFor(value, step, origin);
  const scaledValue = Math.round(value * scale);
  const scaledStep = Math.round(step * scale);
  const scaledOrigin = Math.round(origin * scale);
  const count = Math[mode]((scaledValue - scaledOrigin) / scaledStep);
  return (scaledOrigin + count * scaledStep) / scale;
};

export const stepNumber = (current: number | null, steps: number, bounds: NumberBounds): number => {
  const { step, min, max } = bounds;
  const base = current ?? 0;
  const scale = scaleFor(base, step);
  const raw = (Math.round(base * scale) + Math.round(steps * step * scale)) / scale;
  const snapped = snapToStep(raw, step, min ?? 0, steps > 0 ? 'floor' : 'ceil');
  return clampNumber(snapped, min, max);
};
