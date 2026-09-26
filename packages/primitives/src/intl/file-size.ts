import { formatterFor } from './number-format';

const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'] as const;
const STEP = 1024;

const exponentOf = (bytes: number): number =>
  Math.min(UNITS.length - 1, Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(STEP)));

export const formatFileSize = (bytes: number, locale: string): string => {
  const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  const exponent = exponentOf(safe);

  return formatterFor(locale, {
    style: 'unit',
    unit: UNITS[exponent],
    unitDisplay: 'short',
    maximumFractionDigits: exponent === 0 ? 0 : 1,
  }).format(safe / STEP ** exponent);
};
