import type { ReferenceBundle } from './reference.types.ts';

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isReferenceBundle = (value: unknown): value is ReferenceBundle =>
  isRecord(value) &&
  value.version === 1 &&
  isRecord(value.components) &&
  isRecord(value.catalogs) &&
  Array.isArray(value.declarations) &&
  Array.isArray(value.tokens) &&
  Array.isArray(value.icons) &&
  Array.isArray(value.stylesheets);

export const parseBundle = (json: string): ReferenceBundle => {
  const value: unknown = JSON.parse(json);

  if (!isReferenceBundle(value)) {
    throw new Error('The docs reference bundle has an unexpected shape; run pnpm docs:reference');
  }
  return value;
};
