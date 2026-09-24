export const formatCount = (count: number, max: number): string =>
  count > max ? `${max}+` : String(count);
