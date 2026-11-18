import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { KitManifest } from './vite.types';

const MANIFEST = '@numior/kit/manifest.json';

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

const isManifest = (value: unknown): value is KitManifest =>
  isRecord(value) &&
  Array.isArray(value.order) &&
  isRecord(value.components) &&
  isRecord(value.exports);

export const parseManifest = (text: string): KitManifest => {
  const parsed: unknown = JSON.parse(text);

  if (!isManifest(parsed)) {
    throw new Error('@numior/kit: manifest.json is not a kit manifest');
  }
  return parsed;
};

export const readManifest = (): KitManifest =>
  parseManifest(readFileSync(createRequire(import.meta.url).resolve(MANIFEST), 'utf8'));
