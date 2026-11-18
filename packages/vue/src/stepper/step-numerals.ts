const COUNTER_STYLES = new Map([
  ['arab', 'arabic-indic'],
  ['arabext', 'persian'],
  ['beng', 'bengali'],
  ['deva', 'devanagari'],
  ['mymr', 'myanmar'],
  ['thai', 'thai'],
  ['khmr', 'khmer'],
  ['laoo', 'lao'],
  ['tibt', 'tibetan'],
]);

export const counterStyleOf = (numbers: Intl.NumberFormat): string =>
  COUNTER_STYLES.get(numbers.resolvedOptions().numberingSystem) ?? 'decimal';
