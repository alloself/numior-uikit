import type { WireStep } from '@numior/collaboration';
import type { DocJSON } from '@numior/editor-core';
import type {
  OfflineMeta,
  OfflineOutbox,
  OfflinePlugins,
  OfflineSnapshot,
  OfflineStep,
} from './store.types';

type Fields = Readonly<Record<string, unknown>>;

const isFields = (value: unknown): value is Fields => typeof value === 'object' && value !== null;

const isVersion = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isPlugins = (value: unknown): value is OfflinePlugins =>
  isFields(value) && Object.values(value).every(isVersion);

export const isDocument = (value: unknown): value is DocJSON => isFields(value) && 'root' in value;

const isWireStep = (value: unknown): value is WireStep =>
  isFields(value) && typeof value['kind'] === 'string';

export const isMeta = (value: unknown): value is OfflineMeta => {
  if (!isFields(value) || !isFields(value['schema'])) {
    return false;
  }

  return (
    typeof value['schema']['name'] === 'string' &&
    isVersion(value['schema']['version']) &&
    isPlugins(value['plugins'])
  );
};

export const isSnapshot = (value: unknown): value is OfflineSnapshot =>
  isFields(value) && isVersion(value['version']) && isDocument(value['document']);

const isStep = (value: unknown): value is OfflineStep =>
  isFields(value) && isVersion(value['version']) && isWireStep(value['step']);

export const isOutbox = (value: unknown): value is OfflineOutbox => {
  if (!isFields(value)) {
    return false;
  }

  const steps = value['steps'];

  return (
    typeof value['clientId'] === 'string' &&
    isVersion(value['baseVersion']) &&
    Array.isArray(steps) &&
    steps.every(isWireStep)
  );
};

export const contiguousSteps = (
  values: readonly unknown[],
  from: number,
): readonly OfflineStep[] => {
  const steps: OfflineStep[] = [];

  values.every((value) => {
    if (!isStep(value) || value.version !== from + steps.length) {
      return false;
    }
    steps.push(value);
    return true;
  });

  return steps;
};
