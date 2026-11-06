export const isKey = (event: KeyboardEvent, code: string, key: string): boolean =>
  event.code === code || event.key.toLowerCase() === key;
