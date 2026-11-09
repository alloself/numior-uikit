import {
  RejectReason,
  ServerErrorCode,
  ServerMessageKind,
  type ServerMessage,
  type WireStep,
} from './protocol.types';

type Fields = Readonly<Record<string, unknown>>;

const REASONS: ReadonlySet<unknown> = new Set(Object.values(RejectReason));

const CODES: ReadonlySet<unknown> = new Set(Object.values(ServerErrorCode));

const isFields = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isWireStep = (value: unknown): value is WireStep =>
  isFields(value) && typeof value.kind === 'string';

const isRejectReason = (value: unknown): value is RejectReason => REASONS.has(value);

const isErrorCode = (value: unknown): value is ServerErrorCode => CODES.has(value);

const readRejected = (value: Fields): ServerMessage | undefined =>
  isCount(value.seq) && isCount(value.version) && isRejectReason(value.reason)
    ? {
        kind: ServerMessageKind.Rejected,
        seq: value.seq,
        reason: value.reason,
        version: value.version,
      }
    : undefined;

const readSteps = (value: Fields): ServerMessage | undefined => {
  const { version, clientId, steps } = value;

  return isCount(version) &&
    typeof clientId === 'string' &&
    Array.isArray(steps) &&
    steps.every(isWireStep)
    ? { kind: ServerMessageKind.Steps, version, clientId, steps }
    : undefined;
};

const readAccepted = (value: Fields): ServerMessage | undefined =>
  isCount(value.seq) && isCount(value.version)
    ? { kind: ServerMessageKind.Accepted, seq: value.seq, version: value.version }
    : undefined;

const readWelcome = (value: Fields): ServerMessage | undefined =>
  isCount(value.version)
    ? { kind: ServerMessageKind.Welcome, version: value.version, snapshot: value.snapshot }
    : undefined;

const readError = (value: Fields): ServerMessage | undefined =>
  isErrorCode(value.code) ? { kind: ServerMessageKind.Error, code: value.code } : undefined;

export const parseServerMessage = (value: unknown): ServerMessage | undefined => {
  if (!isFields(value)) {
    return undefined;
  }
  switch (value.kind) {
    case ServerMessageKind.Welcome:
      return readWelcome(value);
    case ServerMessageKind.Accepted:
      return readAccepted(value);
    case ServerMessageKind.Rejected:
      return readRejected(value);
    case ServerMessageKind.Steps:
      return readSteps(value);
    case ServerMessageKind.Error:
      return readError(value);
    default:
      return undefined;
  }
};
