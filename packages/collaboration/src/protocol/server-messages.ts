import {
  RejectReason,
  ServerErrorCode,
  ServerMessageKind,
  type PeerPresence,
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

const isWireSteps = (value: unknown): value is readonly WireStep[] =>
  Array.isArray(value) && value.every(isWireStep);

const readSteps = (value: Fields): ServerMessage | undefined => {
  const { version, clientId, steps, sent } = value;

  return isCount(version) &&
    typeof clientId === 'string' &&
    isWireSteps(steps) &&
    (sent === undefined || isCount(sent))
    ? { kind: ServerMessageKind.Steps, version, clientId, steps, sent }
    : undefined;
};

const readAccepted = (value: Fields): ServerMessage | undefined => {
  const { seq, version, steps } = value;

  return isCount(seq) && isCount(version) && (steps === undefined || isWireSteps(steps))
    ? { kind: ServerMessageKind.Accepted, seq, version, steps }
    : undefined;
};

const isPeerPresence = (value: unknown): value is PeerPresence =>
  isFields(value) && typeof value.clientId === 'string' && Object.hasOwn(value, 'state');

const readWelcome = (value: Fields): ServerMessage | undefined => {
  const { version, snapshot, presence } = value;

  return isCount(version) && Array.isArray(presence) && presence.every(isPeerPresence)
    ? { kind: ServerMessageKind.Welcome, version, snapshot, presence }
    : undefined;
};

const readPresence = (value: Fields): ServerMessage | undefined =>
  isPeerPresence(value)
    ? { kind: ServerMessageKind.Presence, clientId: value.clientId, state: value.state }
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
    case ServerMessageKind.Presence:
      return readPresence(value);
    case ServerMessageKind.Pong:
      return { kind: ServerMessageKind.Pong };
    case ServerMessageKind.Error:
      return readError(value);
    default:
      return undefined;
  }
};
