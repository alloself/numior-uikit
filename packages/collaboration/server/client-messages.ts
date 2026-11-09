import type { SchemaStamp } from '@numior/editor-core';
import {
  ClientMessageKind,
  type ClientMessage,
  type WireStep,
} from '../src/protocol/protocol.types.ts';

type Fields = Readonly<Record<string, unknown>>;

const isFields = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isWireStep = (value: unknown): value is WireStep =>
  isFields(value) && typeof value.kind === 'string';

const isStamp = (value: unknown): value is SchemaStamp =>
  isFields(value) && typeof value.name === 'string' && typeof value.version === 'number';

const readHello = (value: Fields): ClientMessage | undefined => {
  const { doc, clientId, version, schema } = value;

  return typeof doc === 'string' &&
    typeof clientId === 'string' &&
    (version === null || isCount(version)) &&
    isStamp(schema)
    ? { kind: ClientMessageKind.Hello, doc, clientId, version, schema }
    : undefined;
};

const readSteps = (value: Fields): ClientMessage | undefined => {
  const { seq, version, steps } = value;

  return isCount(seq) && isCount(version) && Array.isArray(steps) && steps.every(isWireStep)
    ? { kind: ClientMessageKind.Steps, seq, version, steps }
    : undefined;
};

export const parseClientMessage = (value: unknown): ClientMessage | undefined => {
  if (!isFields(value)) {
    return undefined;
  }
  switch (value.kind) {
    case ClientMessageKind.Hello:
      return readHello(value);
    case ClientMessageKind.Steps:
      return readSteps(value);
    case ClientMessageKind.Pull:
      return isCount(value.from) ? { kind: ClientMessageKind.Pull, from: value.from } : undefined;
    default:
      return undefined;
  }
};
