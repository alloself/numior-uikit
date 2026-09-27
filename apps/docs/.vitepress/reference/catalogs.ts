import type { CatalogReference, LocalizedText } from './reference.types.ts';

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

const textOf = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  return typeof value === 'function' ? value.toString() : (JSON.stringify(value) ?? '');
};

const catalogOf = (value: unknown): CatalogReference | undefined => {
  if (!isRecord(value) || typeof value.namespace !== 'string') {
    return undefined;
  }
  const { en, ru } = value;

  if (!isRecord(en) || !isRecord(ru)) {
    return undefined;
  }
  const texts: Record<string, LocalizedText> = {};

  for (const key of Object.keys(en).toSorted()) {
    texts[key] = { en: textOf(en[key]), ru: textOf(ru[key]) };
  }
  return { namespace: value.namespace, texts };
};

export const catalogReference = (module: unknown): CatalogReference | undefined => {
  if (!isRecord(module)) {
    return undefined;
  }
  for (const value of Object.values(module)) {
    const catalog = catalogOf(value);

    if (catalog !== undefined) {
      return catalog;
    }
  }
  return undefined;
};
